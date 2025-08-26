const express = require('express');
const OpenAI = require('openai');
const config = require('../config/env');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');
const { reserveUsage, commitUsage, rollbackUsage } = require('../helpers/usage');
const { getGenreDirective, parseOpenAIError, callOpenAIWithRetry, logRequestData, MODEL_DRAFT, MODEL_FINAL, TEMPERATURE_DRAFT, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../helpers/aiHelpers');
const { extractTitleFromScript, saveScript } = require('../helpers/scriptHelpers');
const { enhancePromptWithRAG } = require('../helpers/ragHelpers');

const router = express.Router();

// 대본 대사 줄 수 검증 함수
function validateScriptDialogueLines(script, expectedLines) {
  try {
    // "===대본===" 섹션 추출
    const scriptSection = script.split('===대본===')[1];
    if (!scriptSection) {
      return { isValid: false, actualLines: {}, error: '대본 섹션을 찾을 수 없습니다.' };
    }

    // 각 인물별 대사 줄 수 계산
    const actualLines = {};
    const lines = scriptSection.split('\n');
    
    let currentCharacter = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 빈 줄이나 지시문 스킵
      if (!trimmedLine || 
          trimmedLine.startsWith('===') || 
          trimmedLine.startsWith('**') ||
          trimmedLine.startsWith('[') ||
          trimmedLine.startsWith('(')) {
        continue;
      }
      
      // 인물명: 대사 형태인지 확인
      const characterMatch = trimmedLine.match(/^([^:]+):\s*(.+)$/);
      if (characterMatch) {
        currentCharacter = characterMatch[1].trim();
        const dialogue = characterMatch[2].trim();
        
        if (dialogue && !dialogue.startsWith('[') && !dialogue.startsWith('(')) {
          actualLines[currentCharacter] = (actualLines[currentCharacter] || 0) + 1;
        }
      } else if (currentCharacter && trimmedLine && 
                !trimmedLine.startsWith('[') && 
                !trimmedLine.startsWith('(') &&
                !trimmedLine.includes('===')) {
        // 같은 인물의 연속 대사
        actualLines[currentCharacter] = (actualLines[currentCharacter] || 0) + 1;
      }
    }
    
    // 예상 줄 수와 실제 줄 수 비교
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

// OpenAI 클라이언트 초기화
let openai = null;

if (config.OPENAI_API_KEY) {
  openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY
});
} else {
  console.warn('⚠️ OPENAI_API_KEY가 설정되지 않았습니다. AI 기능이 비활성화됩니다.');
}





  // 대본 생성 API
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('🎭 AI 대본 생성 요청 시작');
    logRequestData(req);
    
    // OpenAI API 키 확인
    if (!openai) {
      console.log('❌ OpenAI API 키가 설정되지 않음');
      return res.status(503).json({
        error: 'AI 서비스를 사용할 수 없습니다.',
        message: 'OpenAI API 키가 설정되지 않았습니다.'
      });
    }
    
    console.log('✅ OpenAI 클라이언트 초기화 완료');
    
    // 사용량 예약 (생성 실패 시 롤백)
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
      characters,
      // 새로운 옵션들
      customPrompt
    } = req.body;

    // 입력값 검증
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

    // 성별 처리 (characterDialogueLines 계산 전에 필요)
    const genderMap = {
      'male': '남성',
      'female': '여성',
      'random': '성별 자유롭게'
    };
    
    const genderText = genderMap[gender] || gender;

    // 등장인물별 대사 분량 계산 (정확한 줄 수로 변환)
    let characterDialogueLines = {};
    
    if (parseInt(characterCount) === 1) {
      // 1인 대본: 모든 대사를 해당 캐릭터가
      const mainCharacter = characters && characters[0] ? characters[0].name : `${genderText} 주인공`;
      characterDialogueLines[mainCharacter] = totalLines;
    } else {
      // 다중 인물 대본: 분량 비율에 따라 정확한 줄 수 계산
      let remainingLines = totalLines;
      const sortedCharacters = [...characters].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
      
      for (let i = 0; i < sortedCharacters.length; i++) {
        const character = sortedCharacters[i];
        const ratio = character.percentage || (100 / characters.length); // 기본값: 균등 분배
        
        let assignedLines;
        if (i === sortedCharacters.length - 1) {
          // 마지막 캐릭터: 남은 줄 수 모두 할당
          assignedLines = remainingLines;
        } else {
          // 비율에 따른 줄 수 계산 (반올림)
          assignedLines = Math.round(totalLines * (ratio / 100));
          // 최소 1줄은 보장
          assignedLines = Math.max(1, assignedLines);
        }
        
        characterDialogueLines[character.name] = assignedLines;
        remainingLines -= assignedLines;
      }
      
      // 남은 줄이 있으면 첫 번째 캐릭터에게 추가
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
      `
    }[genre] || '선택한 장르에 맞게 톤과 분위기를 유지해줘.';



    const genreDirective = genreDirectives;


    // 나이별 세부 지시사항
    const ageDirectives = {
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


    // 캐릭터별 지시사항 생성 (정확한 줄 수로 명시)
    let characterDirectives = '';
    if (parseInt(characterCount) === 1) {
      const mainCharacterName = Object.keys(characterDialogueLines)[0];
      characterDirectives = `1인 독백: ${genderText}, ${ageText}, 역할: 주연 (이야기의 핵심 주인공)
- 대사 분량: 정확히 ${characterDialogueLines[mainCharacterName]}줄의 대사`;
    } else if (characters && Array.isArray(characters)) {
      characterDirectives = characters.map((char, index) => {
        const charGender = char.gender === 'male' ? '남성' : char.gender === 'female' ? '여성' : '성별 자유롭게';
        const charAge = ageMap[char.age] || char.age;
        const roleType = char.roleType || '조연';
        const assignedLines = characterDialogueLines[char.name] || 0;
        const relationship = (char.relationshipWith && char.relationshipType) ? 
          `, ${char.relationshipWith}와(과) ${char.relationshipType} 관계` : '';
        return `인물 ${index + 1}: 이름 "${char.name}", ${charGender}, ${charAge}, 역할: ${roleType}${relationship}
- 대사 분량: 정확히 ${assignedLines}줄의 대사 (다른 인물과 교대로 대화하되 총 ${assignedLines}줄을 담당)`;
      }).join('\n\n');
    }

    // 커스텀 프롬프트가 있다면 우선 적용
    if (customPrompt && customPrompt.trim()) {
      // 인물 태그 처리 (예: /김철수 -> 김철수)
      let processedPrompt = customPrompt;
      if (characters && Array.isArray(characters)) {
        characters.forEach(char => {
          const tagRegex = new RegExp(`\\/${char.name}(?=\\s|$)`, 'g');
          processedPrompt = processedPrompt.replace(tagRegex, char.name);
        });
      }
      
      const prompt = `당신은 한국 드라마, 영화, 연극의 대본을 전문적으로 쓰는 작가입니다.
다음 사용자의 요청에 따라 실제로 한국의 드라마, 영화, 연기 입시에 쓰일 수 있는 퀄리티 높은 대본을 완성하세요.

**사용자 요청:**
${processedPrompt}

**대본 생성 기본 조건:**
 - 총 대사 분량: ${totalLines}줄 (지시문 제외, 순수 대사만)
 - 인원: ${characterCount}명
 - 등장인물별 정확한 분량:
${characterDirectives}

**3. 대본 작성 지침**
 - 문어체, 시적 표현, 과장된 멜로 어투 금지. 
 - 100% 구어체, 실제 대화에서 들을 수 있는 말투 사용.
 - 비유·추상 표현 최소화, 생활어 중심.
 - 상대방을 직접 지칭하는 2인칭 대사 활용 ("너", "당신").
 - 감정은 '점진적으로' 쌓이며 후반에 폭발 또는 체념.
 - 중간에 감정을 급격히 변화시키는 촉발 장면이나 대사 배치.
 - 감정이 무거운 장면에서는 가볍거나 유행어 같은 표현은 피하고, 상황에 맞게 진지하고 일관된 톤을 유지하기.
 - 인물이 현실에서 한국어로 말할 때 쓰는 자연스러운 말투만 사용하기.
 - 마지막 대사는 감정이 남도록 구성.
 - 대본과 상황을 정확하게 일치할 것. 예: 누군가에게 고백하는 장면이라면 그 대상 앞에서 말하는 대사, 지시문, 상황을 일치시킬 것.
 - 대사는 자연스럽고 간결하게, 너무 '대본틱'하지 않게.
 - 짧은 문장과 긴 문장을 섞어 리듬을 만든다.
 
**🎭 무대 지시문 작성 원칙:**
 - 모든 대사에는 배우들이 연습할 수 있는 현실적이고 구체적인 무대 지시문을 포함하세요.
 - 지시문은 괄호 () 안에 작성하며, 감정, 몸짓, 시선, 톤, 행동을 명확히 명시하세요.
 - 예: "안녕하세요." → "안녕하세요. (조심스럽게 고개를 숙이며, 눈을 마주치지 못하고)"
 - 예: "그만해!" → "그만해! (주먹을 불끈 쥐고, 목소리를 떨며 격하게)"
 - 지시문은 연기자가 실제로 실행할 수 있는 구체적인 동작과 감정 표현이어야 함.
 - 추상적인 지시문(마음속으로, 깊이 생각하며 등) 금지. 반드시 외적으로 드러나는 행동과 표정으로 표현.
 
**대본 생성 형식:**
다음 형식을 정확히 따라 작성하세요.


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
  `${Object.keys(characterDialogueLines)[0]}: [정확히 ${Object.values(characterDialogueLines)[0]}줄의 대사 작성]
같은 인물의 대사라면 인물명 작성은 생략한다.` :
  `각 인물별로 정확히 지정된 대사 줄 수에 맞춰 작성:
${characters && characters.map((char, index) => 
  `${char.name}: [정확히 ${characterDialogueLines[char.name] || 0}줄의 대사 담당]`
).join('\n')}`
}

===연기 팁===
[감정 흐름과 호흡 지침]

**중요**: 사용자의 요청을 최우선으로 하되, 자연스럽고 연기하기 좋은 대본으로 작성하세요.`;

      // RAG 기반 프롬프트 향상 (커스텀 모드)
      console.log('🔍 커스텀 모드 RAG 기반 참고 청크 검색 중...');
      const customRagCriteria = {
        genre: genre || '드라마',
        ageGroup: age,
        gender: gender,
        mood: '일반' // 커스텀 모드는 일반적인 mood 사용
      };
      
      const enhancedCustomPrompt = await enhancePromptWithRAG(prompt, customRagCriteria);

      // OpenAI API 호출 with 재시도 및 타임아웃
      console.log('🚀 OpenAI API 호출 시작 (커스텀 프롬프트 모드)');
      const completion = await callOpenAIWithRetry(openai, {
        model: MODEL_FINAL,
        messages: [
          {
            role: "system",
            content: `당신은 전문적인 한국 대본 작가입니다. 다음 원칙을 따라 고품질 연기용 대본을 작성하세요:

대본은 반드시 한국어로 작성하며, 표준 대본 형식을 따르세요.`
          },
          {
            role: "user",
            content: enhancedCustomPrompt
          }
        ],
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        temperature: TEMPERATURE_FINAL
      });

      const generatedScript = completion.choices[0].message.content;
      const extractedTitle = extractTitleFromScript(generatedScript);
      const title = extractedTitle || `${genre || '사용자 지정'} 대본`;

      // 스크립트 저장 (공통 함수 사용)
      const savedScript = await saveScript(req.user.id, generatedScript, {
        title: title,
        genre: genre || '사용자 지정',
        characterCount: parseInt(characterCount) || 1,
        length: length,
        gender: gender,
        age: age,
        isCustom: true,
        prompt: customPrompt
      });

      // 생성 성공 시 사용량 커밋
      await commitUsage(req.user.id);

      res.json({
        success: true,
        script: {
          id: savedScript.id,
          title: title,
          content: generatedScript,
          characterCount: parseInt(characterCount),
          genre: genre || '사용자 지정',
          length: length,
          gender: gender,
          age: age,
          createdAt: new Date().toISOString()
        },
        metadata: {
          customPrompt: true,
          generatedAt: new Date().toISOString()
        },
        finalPrompt: enhancedCustomPrompt
      });

      return;
    }

    // 일반 모드 프롬프트 생성
    const prompt = `당신은 한국 드라마, 영화, 연극의 대본을 전문적으로 쓰는 작가입니다.  
다음 조건에 맞춰 실제로 한국의 드라마, 영화, 연기 입시에 쓰일 수 있는 퀄리티 높은 대본을 완성하세요.

**0.작성 조건:**
 - 장르: ${genre}  
 - 총 대사 분량: ${totalLines}줄 (지시문 제외, 순수 대사만)
 - 성별: ${genderText}
 - 연령대: ${ageText}
 - 인원: ${characterCount}명
 - 등장인물별 정확한 대사 분량:
${characterDirectives}

**1. 서사 구조**
 - 점진적 감정 축적 → 마지막 폭발
 - 갑작스러운 고조보다 자연스러운 쌓임 중시
 - 감정의 흐름과 변화가 뚜렷하게 드러나도록 구성 (예: 침착→불안→분노 / 밝음→흔들림→무너짐)

**2. 연령대별 특성 반영**
 - 언어 스타일: ${ageDirective.language}
 - 나이별 이름 참고: ${ageDirective.names}

**3. 대본 작성 지침**
 - 문어체, 시적 표현, 과장된 멜로 어투 금지. 
 - 100% 구어체, 실제 대화에서 들을 수 있는 말투 사용.
 - 비유·추상 표현 최소화, 생활어 중심.
 - 상대방을 직접 지칭하는 2인칭 대사 활용 ("너", "당신").
 - 감정은 '점진적으로' 쌓이며 후반에 폭발 또는 체념.
 - 중간에 감정을 급격히 변화시키는 촉발 장면이나 대사 배치.
 - 감정이 무거운 장면에서는 가볍거나 유행어 같은 표현은 피하고, 상황에 맞게 진지하고 일관된 톤을 유지하기.
 - 인물이 현실에서 한국어로 말할 때 쓰는 자연스러운 말투만 사용하기.
 - 마지막 대사는 감정이 남도록 구성.
 - 대본과 상황을 정확하게 일치할 것. 예: 누군가에게 고백하는 장면이라면 그 대상 앞에서 말하는 대사, 지시문, 상황을 일치시킬 것.
 - 대사는 자연스럽고 간결하게, 너무 '대본틱'하지 않게.
 - 짧은 문장과 긴 문장을 섞어 리듬을 만든다.
 
**🎭 무대 지시문 작성 원칙:**
 - 모든 대사에는 배우들이 연습할 수 있는 현실적이고 구체적인 무대 지시문을 포함하세요.
 - 지시문은 괄호 () 안에 작성하며, 감정, 몸짓, 시선, 톤, 행동을 명확히 명시하세요.
 - 예: "안녕하세요." → "안녕하세요. (조심스럽게 고개를 숙이며, 눈을 마주치지 못하고)"
 - 예: "그만해!" → "그만해! (주먹을 불끈 쥐고, 목소리를 떨며 격하게)"
 - 지시문은 연기자가 실제로 실행할 수 있는 구체적인 동작과 감정 표현이어야 함.
 - 추상적인 지시문(마음속으로, 깊이 생각하며 등) 금지. 반드시 외적으로 드러나는 행동과 표정으로 표현.

**4. 서사 구조**
 1. 초반: 현재 상황 또는 사건에 대한 불만·분노·억울함 직설적으로 제시  
 2. 중반: 구체적 상황·사건 묘사 (회상, 대화, 행동)  
 3. 후반: 감정 정리 → 폭발 or 체념 → 짧고 강한 마무리  

**5. 대본 대사 줄바꿈 및 분량 규칙 (100% 지킬 것)**

1. 한 호흡의 대사가 끝나면 반드시 줄바꿈하여 새로운 줄에 작성한다.
2. 같은 화자라도 감정·주제·분위기가 전환되면 한 줄을 공백으로 띄운 뒤, 새로운 줄에 작성한다.
3. 한 인물의 대사와 그 안의 무대 지시문은 반드시 한 문단으로 유지한다. (지시문은 괄호 안에 작성)
4. **절대적 분량 준수**: 총 ${totalLines}줄의 대사 분량을 반드시 작성해야 한다. 이는 협상 불가능한 필수 조건이다.
5. **인물별 정확한 대사 줄 수 준수**:
${Object.entries(characterDialogueLines).map(([name, lines]) => 
  `   - ${name}: 정확히 ${lines}줄의 대사`
).join('\n')}
   - 줄 수 계산에는 대사만 포함한다. (무대 지시문, 인물명, 빈 줄은 포함하지 않는다)
   - 각 인물의 할당된 줄 수를 절대 초과하거나 부족하지 않는다.
6. **번호 부여 규칙**: 모든 대사 앞에는 반드시 1번부터 ${totalLines}번까지 번호를 붙인다. 
   (예: "1. 예린아. (조심스럽게 눈을 마주치며)")
7. **분량 검증 단계**:
   - 출력이 끝나기 전에, 대사 번호가 정확히 1번부터 ${totalLines}번까지 연속적으로 붙어 있는지 반드시 확인한다.
   - 마지막 줄에 "✅ 총 ${totalLines}줄 확인됨"을 출력한다.
8. **분량 부족 시 대처**: 대사가 부족하면 캐릭터의 감정 표현, 내적 갈등, 상황에 대한 반응을 추가하여 반드시 ${totalLines}줄을 채운다.
9. **분량 초과 시 대처**: 불필요하거나 반복되는 대사를 제거하여 정확히 ${totalLines}줄만 남긴다.

**6. 대본 생성 형식:**
 다음 형식을 정확히 따라 작성하세요. 각 섹션 헤더는 정확히 한 번만 사용하세요.

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
  `${Object.keys(characterDialogueLines)[0]}: [정확히 ${Object.values(characterDialogueLines)[0]}줄의 대사 작성]
같은 인물의 대사라면 인물명 작성은 생략한다.` :
  `각 인물별로 정확히 지정된 대사 줄 수에 맞춰 대화 형식으로 작성:
${characters && characters.map((char, index) => 
  `${char.name}: [정확히 ${characterDialogueLines[char.name] || 0}줄의 대사 담당]`
).join('\n')}

**절대 규칙**: 
- 총 대사 줄 수: 정확히 ${totalLines}줄
- 각 인물별 할당 줄 수를 1줄도 틀리지 않고 정확히 맞춰야 함
- 지시문, 인물명, 빈 줄은 줄 수에 포함되지 않음 (순수 대사만 카운트)
- 대사가 부족하면 감정 표현을 더 세밀하게 추가하여 정확한 분량 달성`
}

===연기 팁===
[감정 흐름과 호흡 지침]


**7. 장르 지시사항:**  
 ${genreDirective}

**8. 역할 유형별 대사 특성:**
주연 (Main role): 이야기의 핵심 인물로서 감정 변화가 가장 크고 깊이 있는 대사를 담당. 갈등의 중심에 있으며 가장 많은 대사 분량과 감정적 몰입도를 가짐.
조연 (Supporting role): 주연을 보조하거나 갈등을 촉발시키는 역할. 주연과의 관계 속에서 이야기를 풍부하게 만드는 대사 구성.
단역 (Minor role): 특정 상황을 설명하거나 분위기를 조성하는 역할. 간결하지만 임팩트 있는 대사로 장면을 완성.
주조연 (Main supporting role): 주연과 함께 극을 끌어가는 강한 조연. 주연과 대등한 감정 깊이를 가지며 독립적인 서사 라인을 가질 수 있음.

**9. 대사 분량 검증 요구사항 (필수):**
- **1단계**: 대본 완성 후 총 대사 줄 수가 정확히 ${totalLines}줄인지 확인
- **2단계**: 각 인물의 실제 대사 줄 수를 카운트하여 할당된 줄 수와 정확히 일치하는지 확인
${Object.entries(characterDialogueLines).map(([name, lines]) => 
    `  * ${name}: 반드시 정확히 ${lines}줄`
  ).join('\n')}
- **3단계**: 분량이 부족하면 감정 표현과 상황 반응을 추가하여 반드시 목표 분량을 달성
- **4단계**: 분량이 초과하면 불필요한 대사를 제거하여 정확한 분량으로 조정
- **최종 검증**: 각 인물의 대사 줄 수 합계 = ${totalLines}줄 (1줄도 틀리면 안 됨)

**❗ 절대 규칙**: 
- 총합이 ${totalLines}줄이 아니면 절대 제출하지 말 것
- 각 인물의 할당 줄 수에서 1줄이라도 틀리면 절대 제출하지 말 것
- 지시문과 인물명은 줄 수에 포함되지 않음 (순수 대사만)

`;

    // RAG 기반 프롬프트 향상
    console.log('🔍 RAG 기반 참고 청크 검색 중...');
    const ragCriteria = {
      genre: genre,
      ageGroup: age,
      gender: gender,
      mood: genre // 장르를 기본 mood로 사용
    };
    
    const enhancedPrompt = await enhancePromptWithRAG(prompt, ragCriteria);

    // OpenAI API 호출 with 재시도 및 대본 검증 루프
    console.log('🚀 OpenAI API 호출 시작');
    let generatedScript;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`📝 대본 생성 시도 ${attempts}/${maxAttempts}`);

      const completion = await callOpenAIWithRetry(openai, {
        model: MODEL_FINAL,
        messages: [
          {
            role: "system",
            content: `당신은 전문적인 한국 대본 작가입니다. 다음 원칙을 따라 고품질 연기용 대본을 작성하세요:

1. **분량 준수 최우선**: 정확한 대사 줄 수를 지켜야 합니다. 이는 가장 중요한 요구사항입니다.
2. **인물별 정확한 분량**: 각 인물의 할당된 대사 줄 수를 1줄도 틀리지 말고 정확히 맞춰야 합니다.
3. **검증 필수**: 대본 완성 후 각 인물의 대사 줄 수를 세어 할당량과 정확히 일치하는지 반드시 확인하세요.
4. **재시도 가능**: 분량이 맞지 않으면 다시 작성을 요청받을 수 있습니다.

대본은 반드시 한국어로 작성하며, 표준 대본 형식을 따르세요.`
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        temperature: TEMPERATURE_FINAL
      });
      
      generatedScript = completion.choices[0].message.content;
      
      // 대본 검증: 각 인물의 대사 줄 수 확인
      const validation = validateScriptDialogueLines(generatedScript, characterDialogueLines);
      
      if (validation.isValid) {
        console.log(`✅ 대본 검증 성공 (시도 ${attempts}/${maxAttempts})`);
        console.log('📊 검증 결과:', validation.actualLines);
        break;
      } else {
        console.log(`⚠️  대본 검증 실패 (시도 ${attempts}/${maxAttempts})`);
        console.log('📊 예상 줄 수:', characterDialogueLines);
        console.log('📊 실제 줄 수:', validation.actualLines);
        console.log('🔄 재생성 중...');
        
        if (attempts === maxAttempts) {
          console.log('❌ 최대 재시도 횟수 초과, 현재 대본으로 진행');
        }
      }
    }

    console.log('✅ OpenAI API 응답 완료');

    // 제목 추출 (없으면 기본 제목 생성)
    const extractedTitle = extractTitleFromScript(generatedScript);
    const title = extractedTitle || `${genre} ${genderText} 독백`;

    // 스크립트 저장 (공통 함수 사용)
    console.log('💾 Supabase에 대본 저장 시작');
    const savedScript = await saveScript(req.user.id, generatedScript, {
      title: title,
      genre: genre,
      characterCount: parseInt(characterCount) || 1,
      length: length,
      gender: gender,
      age: age,
      isCustom: false
    });

    // 생성 성공 시 사용량 커밋
    await commitUsage(req.user.id);

    console.log('✅ Supabase 저장 완료, ID:', savedScript.id);

    res.json({
      success: true,
      script: {
        id: savedScript.id,
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
    console.error('❌ AI 대본 생성 오류 상세:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      type: error.type,
      status: error.status,
      response: error.response?.data
    });
    
    // 에러 발생 시 사용량 롤백 (예약만 했으므로 실제로는 배방 없음)
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

// 대본 리라이팅 API
router.post('/rewrite', async (req, res) => {
  try {
    // OpenAI API 키 확인
    if (!openai) {
      return res.status(503).json({
        error: 'AI 서비스를 사용할 수 없습니다.',
        message: 'OpenAI API 키가 설정되지 않았습니다.'
      });
    }

    const { selectedText, intensity, context, fullScript, genre, gender } = req.body;

    // 입력값 검증
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

    // OpenAI API 호출 with 재시도 및 타임아웃
    const completion = await callOpenAIWithRetry(openai, {
      model: MODEL_FINAL,
      messages: [
        {
          role: "system",
          content: "You are a professional Korean scriptwriter specializing in rewriting dialogue to be more natural and engaging for actors. Always respond in Korean and focus on creating realistic, actable dialogue."
        },
        {
          role: "user",
          content: rewritePrompt
        }
      ],
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
    
    // 공통 에러 핸들러 사용
    const parsed = parseOpenAIError(error);
    return res.status(parsed.http).json({
      error: parsed.code,
      message: parsed.msg
    });
  }
});
// 사용자의 AI 생성 스크립트 목록 조회
router.get('/scripts', authenticateToken, async (req, res) => {
  try {
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
    }, 'AI 스크립트 목록 조회');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      scripts: result.data
    });
  } catch (error) {
    console.error('AI 스크립트 조회 오류:', error);
    res.status(500).json({
      error: '스크립트 조회 중 오류가 발생했습니다.',
      message: '잠시 후 다시 시도해주세요.'
    });
  }
});

// 특정 AI 스크립트 조회
router.get('/scripts/:id', authenticateToken, async (req, res) => {
  try {
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    }, 'AI 스크립트 상세 조회');

    if (!result.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      script: result.data
    });
  } catch (error) {
    console.error('AI 스크립트 조회 오류:', error);
    res.status(500).json({
      error: '스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

// AI 스크립트를 대본함에 저장 (현재 스키마에서는 이미 저장됨)
router.put('/scripts/:id/save', authenticateToken, async (req, res) => {
  try {
    // 현재 스키마에서는 별도의 is_saved 컬럼이 없으므로, 스크립트 존재 여부만 확인
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    }, 'AI 스크립트 조회');

    if (!result.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '스크립트가 이미 대본함에 저장되어 있습니다.',
      script: result.data
    });
  } catch (error) {
    console.error('AI 스크립트 저장 오류:', error);
    res.status(500).json({
      error: '스크립트 저장 중 오류가 발생했습니다.'
    });
  }
});

// AI 스크립트 삭제
router.delete('/scripts/:id', authenticateToken, async (req, res) => {
  try {
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();
    }, 'AI 스크립트 삭제');

    if (!result.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '스크립트가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('AI 스크립트 삭제 오류:', error);
    res.status(500).json({
      error: '스크립트 삭제 중 오류가 발생했습니다.'
    });
  }
});

// 사용량 정보 조회 API
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    console.log('📊 사용량 정보 조회 요청:', req.user.id);
    
    // 사용자 정보 조회 (Admin 클라이언트 사용)
    const userResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();
    }, '사용량 조회용 사용자 정보');

    if (!userResult.success) {
      console.error('❌ 사용량 조회 실패:', userResult.error);
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.data;
    const usage = user.usage || { currentMonth: 0, lastResetDate: null, totalGenerated: 0 };
    const subscription = user.subscription || { plan: 'test' };

    // 월이 바뀌었으면 사용량 리셋
    const now = new Date();
    const lastReset = usage.lastResetDate ? new Date(usage.lastResetDate) : new Date();
    
    let resetUsage = { ...usage };
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      resetUsage.currentMonth = 0;
      resetUsage.lastResetDate = now.toISOString();
      
      // 사용량 리셋을 DB에 저장
      await safeQuery(async () => {
        return await supabaseAdmin
          .from('users')
          .update({ usage: resetUsage })
          .eq('id', req.user.id);
      }, '사용량 리셋 저장');
    }

    // 사용자별 월간 제한 확인
    const userLimit = user.usage?.monthly_limit || 10;
    let canGenerate = true;
    let limit = userLimit;

    if (userLimit === 999999) {
      // 무제한 사용자
      limit = '무제한';
    } else {
      // 일반 사용자 - 월간 제한 확인
      canGenerate = resetUsage.currentMonth < userLimit;
    }

    // 다음 리셋 날짜 계산
    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextResetDate - now) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      usage: {
        currentMonth: resetUsage.currentMonth,
        totalGenerated: resetUsage.totalGenerated,
        limit: limit,
        canGenerate: canGenerate,
        planType: subscription.plan,
        nextResetDate: nextResetDate.toISOString(),
        daysUntilReset: daysUntilReset
      }
    });

    console.log('✅ 사용량 정보 조회 완료:', {
      currentMonth: resetUsage.currentMonth,
      limit: limit,
      canGenerate: canGenerate
    });

  } catch (error) {
    console.error('❌ 사용량 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용량 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 저장된 AI 스크립트 목록 조회 (대본함용) - 현재 스키마에 맞게 수정
router.get('/saved', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
    }, '저장된 AI 스크립트 목록 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '데이터베이스 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      scripts: result.data || []
    });
  } catch (error) {
    console.error('저장된 AI 스크립트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '저장된 스크립트 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// AI 스크립트 메모 업데이트
router.put('/scripts/:id/memo', authenticateToken, async (req, res) => {
  try {
    const { memo } = req.body;
    
    // 메모는 빈 문자열도 허용 (메모 삭제)
    if (memo !== undefined && memo !== null && memo.length > 1000) {
      return res.status(400).json({
        error: '메모는 1000자를 초과할 수 없습니다.'
      });
    }

    // 스크립트 존재 여부와 소유권 확인
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

    // 메모 업데이트
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