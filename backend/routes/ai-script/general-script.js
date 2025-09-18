const express = require('express');
const OpenAI = require('openai');
const config = require('../../config/env');
const { supabaseAdmin, safeQuery } = require('../../config/supabase');
const { authenticateToken } = require('../../middleware/supabaseAuth');
const { reserveUsage, commitUsage, rollbackUsage } = require('../../helpers/usage');
const { parseOpenAIError, callOpenAIWithRetry, logRequestData, MODEL_FINAL, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../../helpers/aiHelpers');
const { extractTitleFromScript, saveScript } = require('../../helpers/scriptHelpers');
const { enhancePromptWithRAG } = require('../../helpers/ragHelpers');

const router = express.Router();

// OpenAI 클라이언트 초기화
let openai = null;

if (config.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
  });
} else {
  console.warn('⚠️ OPENAI_API_KEY가 설정되지 않았습니다. AI 기능이 비활성화됩니다.');
}

// 번호 기반 대본 대사 줄 수 검증 함수
function validateScriptDialogueLines(script, expectedLines) {
  try {
    const scriptSection = script.split('===대본===')[1];
    if (!scriptSection) {
      return { isValid: false, actualLines: {}, error: '대본 섹션을 찾을 수 없습니다.' };
    }

    const actualLines = {};
    const lines = scriptSection.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 번호가 있는 대사 라인만 카운트: "숫자. 캐릭터명: 대사" 형식
      const numberedDialogueMatch = trimmedLine.match(/^\d+\.\s*([^:]+):\s*(.+)$/);
      if (numberedDialogueMatch) {
        const character = numberedDialogueMatch[1].trim();
        const dialogue = numberedDialogueMatch[2].trim();
        
        if (dialogue && !dialogue.startsWith('[') && !dialogue.startsWith('(')) {
          actualLines[character] = (actualLines[character] || 0) + 1;
        }
      }
    }
    
    let isValid = true;
    for (const [character, expected] of Object.entries(expectedLines)) {
      const actual = actualLines[character] || 0;
      if (actual !== expected) {
        isValid = false;
      }
    }
    
    return {
      isValid,
      actualLines,
      expectedLines
    };
    
  } catch (error) {
    console.error('대본 검증 중 오류:', error);
    return { isValid: false, actualLines: {}, error: error.message };
  }
}

// 대본에서 번호 제거 함수 (사용자에게 보여줄 때)
function removeDialogueNumbers(script) {
  try {
    return script.replace(/^\d+\.\s*([^:]+:)/gm, '$1');
  } catch (error) {
    console.error('번호 제거 중 오류:', error);
    return script;
  }
}

// 일반 대본 생성 API
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('🎭 일반 대본 생성 요청 시작');
    logRequestData(req);
    
    if (!openai) {
      console.log('❌ OpenAI API 키가 설정되지 않음');
      return res.status(503).json({
        error: 'AI 서비스를 사용할 수 없습니다.',
        message: 'OpenAI API 키가 설정되지 않았습니다.'
      });
    }
    
    console.log('✅ OpenAI 클라이언트 초기화 완료');
    
    // 사용량 예약
    let usageInfo;
    try {
      usageInfo = await reserveUsage(req.user.id);
    } catch (error) {
      if (error.statusCode === 429) {
        return res.status(429).json({
          error: error.message,
          message: `이번 달 사용량 한도(${error.details.limit}회)를 초과했습니다. 프리미엄 플랜을 고려해보세요.`,
          ...error.details
        });
      }
      throw error;
    }

    const { 
      characterCount, 
      genre, 
      length, 
      gender, 
      age, 
      characters
    } = req.body;

    // 일반 대본 검증
    if (!characterCount || !genre || !length || !gender || !age) {
      return res.status(400).json({
        error: '모든 필드를 입력해주세요.',
        required: ['characterCount', 'genre', 'length', 'gender', 'age']
      });
    }

    // 멀티 캐릭터 모드일 때 characters 배열 검증
    if (parseInt(characterCount) > 1 && (!characters || !Array.isArray(characters))) {
      return res.status(400).json({
        error: '등장인물이 2명 이상일 때는 각 인물의 설정이 필요합니다.',
        required: ['characters']
      });
    }

    // 대본 길이별 총 대사 줄 수 정의
    const totalDialogueLines = {
      short: 18,   // 실제 대사 18줄 (약 1~2분)
      medium: 35,  // 실제 대사 35줄 (약 3~5분)
      long: 70     // 실제 대사 70줄 (약 5~10분)
    };

    const totalLines = totalDialogueLines[length] || totalDialogueLines.medium;

    // 성별 처리
    const genderMap = {
      'male': '남성',
      'female': '여성',
      'random': '성별 자유롭게'
    };
    
    const genderText = genderMap[gender] || gender;

    // 등장인물별 대사 분량 계산
    let characterDialogueLines = {};
    
    if (parseInt(characterCount) === 1) {
      const mainCharacter = characters && characters[0] ? characters[0].name : `${genderText} 주인공`;
      characterDialogueLines[mainCharacter] = totalLines;
    } else {
      let remainingLines = totalLines;
      const sortedCharacters = [...characters].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
      
      for (let i = 0; i < sortedCharacters.length; i++) {
        const character = sortedCharacters[i];
        const ratio = character.percentage || (100 / characters.length);
        
        let assignedLines;
        if (i === sortedCharacters.length - 1) {
          assignedLines = remainingLines;
        } else {
          assignedLines = Math.round(totalLines * (ratio / 100));
          assignedLines = Math.max(1, assignedLines);
        }
        
        characterDialogueLines[character.name] = assignedLines;
        remainingLines -= assignedLines;
      }
      
      if (remainingLines > 0) {
        const firstCharacter = sortedCharacters[0].name;
        characterDialogueLines[firstCharacter] += remainingLines;
      }
    }

    // 검증: 총 줄 수 확인
    const calculatedTotal = Object.values(characterDialogueLines).reduce((sum, lines) => sum + lines, 0);
    if (calculatedTotal !== totalLines) {
      console.log(`⚠️  줄 수 계산 오차: 예상 ${totalLines}, 계산 ${calculatedTotal}`);
    }

    console.log('📊 등장인물별 대사 분량:', characterDialogueLines);
    console.log('🔍 받은 캐릭터 데이터:', characters);

    // 대본 길이 설명 텍스트
    const lengthText = `${length} 대본 (총 ${totalLines}줄의 대사 분량)`;
    
    // 나이별 설정
    const ageMap = {
      'children': '어린이 (5~9세)',
      'kids': '초등학생 (10~12세)',
      'teens': '10대',
      '20s': '20대', 
      '30s-40s': '30~40대',
      '50s': '50대',
      '70s+': '70대 이상',
      'random': '10대, 20대, 30대, 40대, 50대, 70+대 중 랜덤'
    };
    
    const ageText = ageMap[age] || age;
    
    // 장르별 지시사항
    const genreDirectives = {
      '로맨스': `
      따뜻하고 설레는 한국 드라마 스타일의 감정과 상황이 담긴 로맨스 대본을 써줘.  
      사랑에 빠진 인물이 상대방 앞에서 진심 어린 감정을 표현하는 장면을 중심으로,  
      설렘과 긴장, 조심스러운 고백까지 감정의 흐름을 세밀하게 담아내고,  
      결말은 희망적이고 따뜻하게 마무리해줘.  
      `,
      '비극': `
      깊고 무거운 비극적 감정과 상황을 담아 대본을 써줘.  
      주인공이 절망과 상실감, 분노 등을 점진적으로 쌓아가다 감정이 폭발하는 장면에 집중해.  
      침묵, 고독, 체념 같은 분위기가 잘 느껴지도록 행동 지시문을 포함하고,  
      결말은 씁쓸하고 여운이 남게 마무리해줘.  
      대사는 짧고 강렬하며 현실적인 말투로 작성해줘.  
      `,
      '코미디': `
      재미있고 웃긴 상황과 대사를 중심으로 코미디 스타일 대본을 써줘.  
      과장되거나 어색하지 않은 자연스러운 유머, 말장난, 타이밍 좋은 대사들이 포함되게 하고,  
      등장인물 간의 익살스러운 상호작용과 반응을 행동 지시문으로 살려줘.  
      분위기는 밝고 경쾌하며, 감정 변화는 빠르고 리듬감 있게.  
      결말은 가볍고 웃음을 남기는 식으로 마무리해줘.  
      `,
      '스릴러': `
      긴장감 넘치고 불안한 분위기와 상황을 조성하는 스릴러 스타일 대본을 써줘.  
      등장인물의 의심, 공포, 불신이 점점 커지면서 극한 상황에 몰리는 장면에 집중해.  
      긴장감 있는 대사와 숨소리, 시선 처리 같은 행동 지시문을 포함하고,  
      대사는 짧고 강렬하며 분위기를 유지할 수 있게 써줘.  
      결말은 충격적이거나 반전이 있으면 좋고, 여운을 남겨줘.  
      `,
      '액션': `
      빠른 호흡과 긴박감 넘치는 장면 위주로 액션 스타일 대본을 써줘.  
      싸움, 추격, 위기 상황에서 등장인물들이 긴장감 있게 소통하는 장면에 집중해.  
      대사는 명령형이나 도발적, 단호한 톤으로 쓰고,  
      행동 지시문은 역동적이고 구체적으로 표현해줘.  
      결말은 긴장감 유지 혹은 강렬한 클라이맥스로 마무리해줘.  
      `,
      '공포': `
      섬뜩하고 무서운 분위기와 상황을 조성하는 공포 스타일 대본을 써줘.  
      등장인물의 불안, 공포, 긴장감이 극대화되는 장면에 집중하고,  
      소리, 움직임, 주변 환경 묘사를 행동 지시문으로 섬세하게 넣어줘.  
      대사는 긴장감을 유지할 수 있도록 간결하고 사실적으로 써줘.  
      결말은 미스터리하거나 소름 돋는 여운을 남기는 방식으로.  
      `,
      '판타지': `
      환상적이고 신비로운 분위기와 상황을 담은 판타지 스타일 대본을 써줘.  
      마법, 신화적 존재, 이세계 등 장면 설정과 대사를 구체적으로 표현하고,  
      등장인물의 특별한 능력이나 사명을 중심으로 이야기를 전개해줘.  
      대사는 운율감 있거나 신비롭게 쓰되 자연스러운 톤 유지,  
      행동 지시문으로 환상적인 분위기를 살려줘.  
      결말은 희망적이거나 미스터리한 여운을 남겨줘.  
      `,
      'SF': `
      논리적이고 미래적인 배경과 상황을 담은 SF 스타일 대본을 써줘.  
      과학적 개념이나 첨단 기술을 자연스럽게 녹여내고,  
      등장인물 간의 논쟁, 문제 해결 과정 등을 중심으로 감정과 긴장을 표현해줘.  
      대사는 명확하고 간결하며 전문용어 사용은 최소화,  
      행동 지시문은 상황의 긴박함과 인물 심리를 섬세히 반영해줘.  
      결말은 열린 결말이나 충격적 반전 가능.  
      `,
      '시대극': `
      역사적 배경과 시대상에 맞는 언어와 태도를 사용한 시대극 스타일 대본을 써줘.
      권력, 의리, 배신, 명예 같은 주제를 중심으로 감정이 깊게 쌓이는 장면을 묘사해줘.
      대사는 고어체는 피하되 시대에 어울리는 격식 있고 무게감 있는 말투,
      행동 지시문은 절제되고 품위 있게 작성해줘.
      결말은 운명을 받아들이는 체념이나 강렬한 감정 폭발 중 하나로 마무리해줘.
      `,
      '드라마': `
      현실적이고 깊이 있는 인간관계와 갈등을 중심으로 한 드라마 스타일 대본을 써줘.
      등장인물의 내면 심리와 복잡한 감정, 현실적인 문제 상황을 섬세하게 표현하고,
      자연스러운 일상 대화체를 사용하되 감정의 깊이를 놓치지 말아줘.
      행동 지시문은 미묘한 표정 변화나 몸짓으로 심리 상태를 드러내도록,
      결말은 여운이 남거나 생각할 거리를 주는 방식으로 마무리해줘.
      `,
      '미스터리': `
      수수께끼와 의문점이 가득한 긴장감 넘치는 미스터리 스타일 대본을 써줘.
      등장인물들의 의심스러운 행동과 모호한 대사, 숨겨진 진실을 암시하는 장면에 집중해.
      대사는 이중적 의미나 암시적 표현을 활용하고,
      행동 지시문은 의심스러운 시선, 주저하는 모습 등으로 긴장감을 조성해줘.
      결말은 반전이나 새로운 의문을 제기하는 방식으로 호기심을 자극해줘.
      `
    };

    const genreDirective = genreDirectives[genre] || '선택한 장르에 맞게 톤과 분위기를 유지해줘.';

    // 나이별 세부 지시사항
    const ageDirectives = {
      'children': {
        language: '어린이다운 순수하고 직접적인 말투 사용. "와!", "우와", "진짜야?", "좋아!" 등의 감탄사 활용. 문장은 짧고 명확하게',
        names: '2015년~2020년 출생 세대의 이름 (예: 김도윤, 이서윤, 박건우, 최서연, 정하준, 강예서)'
      },
      'kids': {
        language: '초등학생다운 호기심 넘치는 말투 사용. "왜?", "어떻게?", "정말?" 등의 질문 많이 활용. 친구들과의 대화체',
        names: '2010년~2015년 출생 세대의 이름 (예: 김시우, 이채원, 박준서, 최하윤, 정서준, 강예린)'
      },
      'teens': {
        language: '10대 특유의 생동감 있고 직접적인 말투 사용. "진짜", "완전", "대박", "헐" 등의 자연스러운 감탄사 활용',
        names: '2000년대 후반~2010년대 초반 출생 세대의 이름 (예: 김지호, 박서연, 이도윤, 최하은, 정시우, 강유나)'
      },
      '20s': {
        language: '20대 특유의 자연스러운 구어체, 짧고 간결한 문장 위주로, 친근하고 솔직한 말투로 작성해줘.',
        names: '1990년대 후반~2000년대 초반 출생 세대의 이름 (예: 김민준, 이지원, 박준호, 최예린, 정현우, 송지은)'
      },
      '30s-40s': {
        language: '안정적이고 성숙한 어조. 감정 표현이 절제되어 있으면서도 깊이 있는 말투. "그렇구나", "음..." 등의 사려깊은 표현',
        names: '1980년대~1990년대 초반 출생 세대의 이름 (예: 김성민, 박미영, 이재혁, 최수진, 정동훈, 한소영)'
      },
      '50s': {
        language: '차분하고 경험이 묻어나는 말투. "그런 게 아니야", "인생이 뭔지 알겠더라" 등 인생 경험을 바탕으로 한 표현',
        names: '1960년대~1970년대 출생 세대의 이름 (예: 김영수, 박순희, 이기홍, 최미경, 정철수, 오금순)'
      },
      '70s+': {
        language: '경험과 지혜가 묻어나는 깊이 있는 말투. "그때는 말이야", "나 같은 늙은이가" 등 겸손하면서도 따뜻한 표현',
        names: '1940년대~1950년대 출생 세대의 이름 (예: 김철수, 박영자, 이만수, 최순자, 정봉술, 오영희)'
      }
    };
    
    const ageDirective = ageDirectives[age] || ageDirectives['20s'];

    // 캐릭터별 지시사항 생성
    let characterDirectives = '';
    if (parseInt(characterCount) === 1) {
      const mainCharacterName = Object.keys(characterDialogueLines)[0];
      characterDirectives = `1인 독백: ${genderText}, ${ageText}, 역할: 주연 (이야기의 핵심 주인공)
- 대사 분량: 약 ${characterDialogueLines[mainCharacterName]}줄의 대사`;
    } else if (characters && Array.isArray(characters)) {
      characterDirectives = characters.map((char, index) => {
        const charGender = char.gender === 'male' ? '남성' : char.gender === 'female' ? '여성' : '성별 자유롭게';
        const charAge = ageMap[char.age] || char.age;
        const roleType = char.roleType || '조연';
        const assignedLines = characterDialogueLines[char.name] || 0;
        const relationship = (char.relationshipWith && char.relationshipType) ? 
          `, ${char.relationshipWith}와(과) ${char.relationshipType} 관계` : '';
        
        return `인물 ${index + 1}: 이름 "${char.name}", ${charGender}, ${charAge}, 역할: ${roleType}${relationship}
- 대사 분량: 약 ${assignedLines}줄의 대사 (다른 인물과 교대로 대화하되 총 ${assignedLines}줄을 담당)`;
      }).join('\n\n');
    }

    // 일반 대본 프롬프트 생성
    const prompt = `당신은 한국 드라마, 영화, 연극의 대본을 전문적으로 쓰는 작가입니다.  
다음 조건에 맞춰 실제로 한국의 드라마, 영화, 연기 입시에 쓰일 수 있는 퀄리티 높은 대본을 완성하세요.

1. 톤 (Tone)  
- 과장되지 않은 구어체  
- 실제 친구나 가족에게 말하듯 솔직한 어투  
- “있잖아”, “근데”, “야” 같은 일상적 접속사 자주 사용  

2. 대사 흐름 (Flow)  
- 단문 중심: 한 줄에 한 생각  
- 중간중간 끊김: 망설임, 감정의 흔들림을 짧게 표현  
- 반복/변주: 감정을 강조할 때 같은 말을 반복 (“아니야, 아니야, 해, 해”)  

3. 맥락 (Context)  
- 주인공 혼자 말하지만 구체적인 상황이나 사건이 깔려 있어야 함  
- 사건 회상 → 감정 반응 → 갈등 → 결론 구조로 진행  
- 청자가 없는 듯하지만, 사실은 누군가에게 말하듯 흘러감  

4. 표현 방식 (Expression)  
- 내적 갈등 드러내기: ‘숨기고 싶다’ vs ‘말하고 싶다’  
- 비유 대신 현실 묘사: 눈물, 웃음, 술, 가족, 친구 같은 실제적 요소 사용  
- 감정 기복: 차분하다가도 갑자기 격해지고, 다시 담담해짐  

[대본 조건]  

2. 말투는 현실적인 구어체로, 실제 드라마에서 배우가 말해도 어색하지 않아야 합니다.  
3. 반드시 포함해야 할 요소:  
   - 라임멘트: 같은 구조로 반복되거나 리듬감 있는 표현 (예: "말할까 하다가, 또 못 했어.")  
   - 엔딩멘트: 마지막 부분에서 담백하면서도 여운을 남기는 고백 (예: "나, 너 좋아해. 그냥 네 옆에 있고 싶어.")  
4. 구체적인 계기나 맥락을 넣어, 왜 이런 감정을 느끼는지 설득력 있게 표현하세요.  
   (예: "첫눈 오는 날 네가 웃던 순간", "도서관에서 네가 잠들어 있던 모습")  
5. 불필요하게 문학적이거나 연극적인 표현은 피하고, 짧은 구어체 문장을 사용하세요.  

⚠️ **절대 중요**: 위는 아이디어 참고용이며, 실제로는 요청받은 장르/상황에 맞게 완전히 새롭고 독창적인 조합으로 만들어야 함
  
**0.작성 조건:**
 - 장르: ${genre}  
 - 총 대사 분량: 약 ${totalLines}줄 (지시문 제외, 순수 대사만)
 - 성별: ${genderText}
 - 연령대: ${ageText}
 - 인원: ${characterCount}명
 - 등장인물별 대사 분량:
${characterDirectives}

**1. 서사 구조**
 - 점진적 감정 축적 → 마지막 폭발
 - 갑작스러운 고조보다 자연스러운 쌓임 중시
 - 감정의 흐름과 변화가 뚜렷하게 드러나도록 구성 (예: 침착→불안→분노 / 밝음→흔들림→무너짐)

**2. 연령대별 특성 반영**
 - 언어 스타일: ${ageDirective.language}
 - 나이별 이름 참고: ${ageDirective.names}


 



**3. 장르 지시사항:**  
 ${genreDirective}

**4. 역할 유형별 대사 특성:**
주연 (Main role): 이야기의 핵심 인물로서 감정 변화가 가장 크고 깊이 있는 대사를 담당. 갈등의 중심에 있으며 가장 많은 대사 분량과 감정적 몰입도를 가짐.
조연 (Supporting role): 주연을 보조하거나 갈등을 촉발시키는 역할. 주연과의 관계 속에서 이야기를 풍부하게 만드는 대사 구성.
단역 (Minor role): 특정 상황을 설명하거나 분위기를 조성하는 역할. 간결하지만 임팩트 있는 대사로 장면을 완성.
주조연 (Main supporting role): 주연과 함께 극을 끌어가는 강한 조연. 주연과 대등한 감정 깊이를 가지며 독립적인 서사 라인을 가질 수 있음.

**5. 대본 생성 형식 및 규칙:**

**📋 표준 대본 구조:**
반드시 다음 섹션 순서로 작성하세요 (각 헤더는 정확히 한 번만 사용):

감정이나 상황을 압축한 제목

===상황 설명===
어떤 상황에서 누구에게 하는 말인지, 왜 이런 감정 상태인지 3-4줄로 설명

===등장인물===
${parseInt(characterCount) === 1 ?
  ` 이름: [실제 한국 이름]
 나이: [해당 연령대]
 역할: 주연 (이야기의 핵심 주인공)
 성격: [간략한 성격과 현재 상황]` :
  `${characters && characters.map((char, index) =>
    ` 인물 ${index + 1}: ${char.name}
 나이: ${ageMap[char.age] || char.age}
 역할: ${char.roleType || '조연'}
 성격: [간략한 성격과 현재 상황, 역할 유형에 맞는 특성 반영]`
  ).join('\n\n')}`
}

===대본===
${parseInt(characterCount) === 1 ?
  `${Object.keys(characterDialogueLines)[0]}: [약 ${Object.values(characterDialogueLines)[0]}줄의 대사 작성]
같은 인물의 대사라면 인물명 작성은 생략한다.` :
  `각 인물별로 지정된 대사 줄 수에 맞춰 대화 형식으로 작성:
${characters && characters.map((char, index) =>
  `${char.name}: [약 ${characterDialogueLines[char.name] || 0}줄의 대사 담당]`
).join('\n')}`
}

===연기 팁===
[감정 흐름과 호흡 지침]

**📏 분량 제어 규칙**:
- 총 대사 줄 수: 약 ${totalLines}줄의 자연스러운 대화
- 모든 대사는 "캐릭터명: 대사내용" 형식으로 작성 (번호 없음)
- 서술형 지시문을 적절히 활용하여 자연스럽게 구성
- 각 인물별 대화 비중을 적절히 배분

**✅ 올바른 대본 형식 (반드시 준수):**
지원: 여기서 너를 다시 만날 줄은 몰랐어.
[지원은 잠시 시선을 피하며 말을 찾는다]
지원: 사실, 그때는 잘못한 게 많았어.
지원: 내가 말을 잘못했거나, 너를 오해했던 것 같아.

**❌ 절대 사용 금지 형식:**
- 1. 민수: 안녕하세요 ← 번호 있는 대사
- (머뭇거리며) ← 괄호 무대지시문
- [민수가 웃는다] ← 단순 동작만 서술

`;

    // RAG 기반 프롬프트 향상
    console.log('🔍 RAG 기반 참고 청크 검색 중...');
    const ragCriteria = {
      genre: genre,
      ageGroup: age,
      gender: gender,
      characterCount: parseInt(characterCount),
      mood: genre
    };
    
    const enhancedPrompt = await enhancePromptWithRAG(prompt, ragCriteria);

    // OpenAI API 호출 (단일 시도로 성능 최적화)
    console.log('🚀 OpenAI API 호출 시작');
    
    const completion = await callOpenAIWithRetry(openai, [
      {
        role: "system",
        content: `당신은 전문적인 한국 대본 작가입니다. 사용자가 제공한 상세한 형식 및 규칙을 정확히 따라 고품질 연기용 대본을 작성하세요.

핵심 원칙:
1. 제공된 섹션 구조를 정확히 준수 (제목, ===상황 설명===, ===등장인물===, ===대본===, ===연기 팁===)
2. 지정된 대사 줄 수 정확히 준수
3. 자연스럽고 연기 가능한 대화 및 지시문 작성
4. 한국어 표준 대본 형식 엄수`
      },
      {
        role: "user",
        content: enhancedPrompt
      }
    ], {
      model: MODEL_FINAL,
      max_completion_tokens: (length === 'short' ? 900 : (length === 'medium' ? 1500 : (length === 'long' ? 2500 : Math.min(MAX_COMPLETION_TOKENS, 1500)))),
      temperature: TEMPERATURE_FINAL
    }, { tries: 1, base: 60000 });
    
    const rawScript = completion.choices[0].message.content;
    
    // 디버깅: 생성된 대본 내용 로깅
    console.log('🎭 생성된 원본 대본 길이:', rawScript?.length || 0);
    console.log('🎭 생성된 원본 대본 미리보기:', rawScript?.substring(0, 200) || 'NULL');
    
    // 대본 검증 (번호 기반)
    const validation = validateScriptDialogueLines(rawScript, characterDialogueLines);
    
    // 사용자에게 보여줄 대본에서 번호 제거
    const generatedScript = removeDialogueNumbers(rawScript);
    
    // 디버깅: 처리된 대본 내용 로깅
    console.log('📝 처리된 대본 길이:', generatedScript?.length || 0);
    console.log('📝 처리된 대본 미리보기:', generatedScript?.substring(0, 200) || 'NULL');
    
    if (validation.isValid) {
      console.log('✅ 대본 분량 검증 성공');
      console.log('📊 검증 결과:', validation.actualLines);
    } else {
      console.log('⚠️  대본 분량이 예상과 다름 (성능 최적화를 위해 그대로 진행)');
      console.log('📊 예상 줄 수:', characterDialogueLines);
      console.log('📊 실제 줄 수:', validation.actualLines);
    }

    console.log('✅ OpenAI API 응답 완료');

    // 제목 추출 (없으면 기본 제목 생성)
    const extractedTitle = extractTitleFromScript(generatedScript);
    const title = extractedTitle || `${genre} ${genderText} 독백`;

    // 스크립트 저장
    console.log('💾 Supabase에 대본 저장 시작');
    let savedScript;
    try {
      savedScript = await saveScript(req.user.id, generatedScript, {
      title: title,
      genre: genre,
      characterCount: parseInt(characterCount) || 1,
      length: length,
      gender: gender,
      age: age,
      isCustom: false
      });
    } catch (saveErr) {
      console.error('⚠️ 스크립트 저장 실패(생성 결과는 반환):', saveErr?.message || saveErr);
      savedScript = { id: null };
    }

    // 생성 성공 시 사용량 커밋
    try {
      await commitUsage(req.user.id);
    } catch (uErr) {
      console.warn('⚠️ 사용량 커밋 경고:', uErr?.message || uErr);
    }

    console.log('✅ Supabase 저장 완료, ID:', savedScript?.id || null);

    res.json({
      success: true,
      scriptId: savedScript.id,
      script: {
        id: savedScript?.id || null,
        title: title,
        content: generatedScript,
        characterCount: parseInt(characterCount),
        genre: genre,
        length: length,
        gender: gender,
        age: age,
        createdAt: new Date().toISOString()
      },
      metadata: {
        characterCount,
        genre,
        gender: genderText,
        age: ageText,
        length: lengthText,
        generatedAt: new Date().toISOString()
      },
      finalPrompt: enhancedPrompt
    });

  } catch (error) {
    console.error('❌ 일반 대본 생성 오류 상세:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      type: error.type,
      status: error.status,
      response: error.response?.data
    });
    
    // 에러 발생 시 사용량 롤백
    await rollbackUsage();
    
    // 공통 에러 핸들러 사용
    const parsed = parseOpenAIError(error);
    return res.status(parsed.http).json({
      error: parsed.code,
      message: parsed.msg,
      ...(process.env.NODE_ENV !== 'production' && { 
        debug: error.message 
      })
    });
  }
});

// GET 메서드로 접근 시 안내 (일부 브라우저/크롤러의 잘못된 호출 대응)
router.get('/generate', (req, res) => {
  return res.status(405).json({
    success: false,
    message: '이 엔드포인트는 POST만 지원합니다. POST /api/general-script/generate를 사용하세요.'
  });
});

// 대본 리라이팅 핸들러 (공통으로 사용됨)
const rewriteHandler = async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({
        error: 'AI 서비스를 사용할 수 없습니다.',
        message: 'OpenAI API 키가 설정되지 않았습니다.'
      });
    }

    const { selectedText, intensity, context, fullScript, genre, gender } = req.body;

    if (!selectedText || !intensity) {
      return res.status(400).json({
        error: '선택된 텍스트와 리라이팅 강도를 입력해주세요.',
        required: ['selectedText', 'intensity']
      });
    }

    // 리라이팅 강도별 지시사항
    const intensityMap = {
      'light': {
        name: '가볍게 수정',
        instruction: '원래 의미와 감정을 유지하면서 자연스러운 표현으로 약간만 수정해주세요. 전체적인 뉘앙스는 그대로 두고 어색한 부분이나 더 자연스러운 표현만 다듬어주세요.'
      },
      'emotional': {
        name: '감정 강조',
        instruction: '감정 표현을 더욱 강화하고 깊이있게 만들어주세요. 인물의 내면 감정이 더 생생하게 드러나도록 하되, 과장되지 않고 현실적으로 표현해주세요.'
      },
      'full': {
        name: '전면 변경',
        instruction: '완전히 새로운 방식으로 다시 작성해주세요. 같은 상황과 의도를 다른 접근법으로 표현하되, 더 임팩트 있고 연기하기 좋은 대사로 만들어주세요.'
      }
    };

    const selectedIntensity = intensityMap[intensity];
    if (!selectedIntensity) {
      return res.status(400).json({
        error: '올바른 리라이팅 강도를 선택해주세요.',
        available: ['light', 'emotional', 'full']
      });
    }

    // 리라이팅 프롬프트 생성
    const rewritePrompt = `당신은 전문 대본 작가로서 기존 대사를 리라이팅하는 작업을 하고 있습니다.

**리라이팅 조건:**
- 리라이팅 강도: ${selectedIntensity.name}
- 장르: ${genre || '미지정'}

**선택된 대사 (리라이팅 대상):**
"${selectedText}"

**주변 맥락 (앞뒤 상황):**
${context || '맥락 정보 없음'}

**전체 대본 정보:**
${fullScript ? '전체 대본이 제공되어 맥락을 파악할 수 있습니다.' : '전체 맥락 정보 없음'}

**리라이팅 지시사항:**
${selectedIntensity.instruction}

**맥락 고려 사항:**
- 선택된 대사가 전체 대본에서 어떤 역할을 하는지 파악하여 리라이팅
- 앞뒤 대사와의 연결성과 자연스러운 흐름 유지
- 등장인물의 관계와 상황에 맞는 말투와 인칭 사용
- 전체 스토리의 감정 흐름을 해치지 않으면서 개선

**⚠️ 리라이팅 시 준수사항:**
- 오글거리거나 인위적인 말버릇 사용 금지 ("이런...", "그냥...", "있잖아...", "하...", "나… 나 진짜…" 등)
- 감정을 억지로 끌어내는 감탄사나 멜로 클리셰 표현 피하기
- 문어체/시적인 표현 금지 ("너의 방문을 기다리며", "하늘은 오늘도 흐리다" 등)
- 명사형 표현 대신 동사 중심 문장 사용
- 실제 사람의 말투처럼 망설임, 말끊김, 솔직한 감정 표현
- 현실적이고 자연스러운 대화체로 작성

**결과 형식:**
리라이팅된 대사만 출력하세요. 추가 설명이나 해석은 포함하지 마세요.`;

    // OpenAI API 호출
    const completion = await callOpenAIWithRetry(openai, [
      {
        role: "system",
        content: "You are a professional Korean scriptwriter specializing in rewriting dialogue to be more natural and engaging for actors. Always respond in Korean and focus on creating realistic, actable dialogue."
      },
      {
        role: "user",
        content: rewritePrompt
      }
    ], {
      model: MODEL_FINAL,
      max_completion_tokens: 1000,
      temperature: TEMPERATURE_FINAL
    });

    const rewrittenText = completion.choices[0].message.content;

    res.json({
      success: true,
      original: selectedText,
      rewritten: rewrittenText,
      intensity: selectedIntensity.name,
      metadata: {
        intensity,
        genre,
        gender,
        rewrittenAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('대본 리라이팅 오류:', error);
    
    const parsed = parseOpenAIError(error);
    return res.status(parsed.http).json({
      error: parsed.code,
      message: parsed.msg
    });
  }
};

router.post('/rewrite', rewriteHandler);

// AI 스크립트 메모 업데이트
router.put('/scripts/:id/memo', authenticateToken, async (req, res) => {
  try {
    const { memo } = req.body;
    
    if (memo !== undefined && memo !== null && memo.length > 1000) {
      return res.status(400).json({
        error: '메모는 1000자를 초과할 수 없습니다.'
      });
    }

    const { safeQuery, supabaseAdmin } = require('../../config/supabase');
    
    const scriptResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('id, user_id')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    }, 'AI 스크립트 소유권 확인');

    if (!scriptResult.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없거나 접근 권한이 없습니다.'
      });
    }

    const updateResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .update({ memo: memo || null })
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();
    }, 'AI 스크립트 메모 업데이트');

    if (!updateResult.success) {
      return res.status(500).json({
        error: '메모 업데이트 중 오류가 발생했습니다.',
        message: updateResult.error.message
      });
    }

    res.json({
      success: true,
      message: '메모가 성공적으로 저장되었습니다.',
      script: updateResult.data
    });

  } catch (error) {
    console.error('AI 스크립트 메모 업데이트 오류:', error);
    res.status(500).json({
      error: '메모 저장 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// AI 스크립트 메모 조회
router.get('/scripts/:id/memo', authenticateToken, async (req, res) => {
  try {
    const { safeQuery, supabaseAdmin } = require('../../config/supabase');
    
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('id, memo')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    }, 'AI 스크립트 메모 조회');

    if (!result.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없거나 접근 권한이 없습니다.'
      });
    }

    res.json({
      success: true,
      memo: result.data.memo || ''
    });

  } catch (error) {
    console.error('AI 스크립트 메모 조회 오류:', error);
    res.status(500).json({
      error: '메모 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
module.exports.rewriteHandler = rewriteHandler;
