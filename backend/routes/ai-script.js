const express = require('express');
const OpenAI = require('openai');
const config = require('../config/env');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');
const { authenticateToken } = require('../middleware/supabaseAuth');

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

// 스크립트에서 제목 추출하는 함수
const extractTitleFromScript = (scriptContent) => {
  if (!scriptContent) return null;
  
  const lines = scriptContent.split('\n');
  
  // **제목:** 패턴 찾기
  for (let line of lines) {
    const titleMatch = line.match(/\*\*제목:\*\*\s*(.+)/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
  }
  
  // [제목] 패턴 찾기  
  for (let line of lines) {
    const titleMatch = line.match(/\[(.+)\]/);
    if (titleMatch && line.includes('제목')) {
      return titleMatch[1].trim();
    }
  }
  
  // 첫 번째 줄이 제목일 가능성
  const firstLine = lines[0]?.trim();
  if (firstLine && firstLine.length < 50 && !firstLine.includes('[') && !firstLine.includes('상황')) {
    return firstLine;
  }
  
  return null;
};

// 사용자 사용량 확인 및 업데이트
const checkAndUpdateUsage = async (userId) => {
  console.log('🔍 사용자 조회 시작:', userId);
  
  // 사용자 정보 조회 (Admin 클라이언트 사용하여 RLS 우회)
  const userResult = await safeQuery(async () => {
    return await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
  }, 'Supabase 사용자 정보 조회');

  if (!userResult.success) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  const user = userResult.data;
  const usage = user.usage || { currentMonth: 0, lastResetDate: null, totalGenerated: 0 };
  const subscription = user.subscription || { plan: 'test' };

  // 월이 바뀌었으면 사용량 리셋
  const now = new Date();
  const lastReset = usage.lastResetDate ? new Date(usage.lastResetDate) : new Date();
  
  if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    usage.currentMonth = 0;
    usage.lastResetDate = now.toISOString();
  }

  // 사용자별 월간 제한 확인 (기본 10회)
  const userLimit = user.usage?.monthly_limit || 10;
  let canGenerate = false;
  let limit = userLimit;

  if (userLimit === 999999) {
    // 무제한 사용자 (관리자가 설정)
    canGenerate = true;
    limit = '무제한';
  } else {
    // 일반 사용자 - 월간 제한 확인
    canGenerate = usage.currentMonth < userLimit;
  }

  if (!canGenerate) {
    const error = new Error('사용량을 초과했습니다.');
    error.statusCode = 429;
    error.details = {
      currentUsage: usage.currentMonth,
      limit: limit,
      planType: subscription.plan,
      nextResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    };
    throw error;
  }

  // 사용량 증가
  usage.currentMonth += 1;
  usage.totalGenerated += 1;

  // 사용량 업데이트 (Admin 클라이언트 사용)
  const updateResult = await safeQuery(async () => {
    return await supabaseAdmin
      .from('users')
      .update({ usage: usage })
      .eq('id', userId);
  }, '사용량 업데이트');
  
  if (!updateResult.success) {
    console.error('❌ 사용량 업데이트 실패:', updateResult.error);
  } else {
    console.log('✅ 사용량 업데이트 완료:', usage);
  }

  return { user, usage };
};

  // 대본 생성 API
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('🎭 AI 대본 생성 요청 시작');
    console.log('📝 요청 데이터:', req.body);
    
    // OpenAI API 키 확인
    if (!openai) {
      console.log('❌ OpenAI API 키가 설정되지 않음');
      return res.status(503).json({
        error: 'AI 서비스를 사용할 수 없습니다.',
        message: 'OpenAI API 키가 설정되지 않았습니다.'
      });
    }
    
    console.log('✅ OpenAI 클라이언트 초기화 완료');
    
    // 사용량 확인 및 업데이트
    let userInfo;
    try {
      userInfo = await checkAndUpdateUsage(req.user.id);
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

    const { characterCount, genre, length, gender, age } = req.body;

    // 입력값 검증
    if (!characterCount || !genre || !length || !gender || !age) {
      return res.status(400).json({
        error: '모든 필드를 입력해주세요.',
        required: ['characterCount', 'genre', 'length', 'gender', 'age']
      });
    }

    // 길이 변환
    const lengthMap = {
      'short': '짧은 대본 (총 대사 6~8줄, 1개의 장면)',
      'medium': '중간 길이 대본 (총 대사 12~16줄, 2개의 장면)',
      'long': '긴 대본 (총 대사 20~30줄, 3~4개의 장면)'
    };

    const lengthText = lengthMap[length] || length;

    // 성별 처리
    const genderMap = {
      'male': '남성',
      'female': '여성',
      'random': '성별 자유롭게'
    };
    
    const genderText = genderMap[gender] || gender;
    
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

    // 등장인물별 지시사항
    const characterDirectivesMap = {
      '1': '자기 고백형 서사로 독백하듯이 내면의 솔직한 이야기를 말하는 구조',
      '2-3': '2-3명의 인물이 자연스럽게 대화하는 구조',
      '4+': '4명 이상의 인물이 자연스럽게 대화하는 구조'
    };
    
    const characterDirectives = characterDirectivesMap[characterCount] || '2-3명의 인물이 자연스럽게 대화하는 구조';

    // 나이별 세부 지시사항
    const ageDirectives = {
      'teens': {
        language: '10대 특유의 생동감 있고 직접적인 말투 사용. "진짜", "완전", "대박", "헐" 등의 자연스러운 감탄사 활용',
        psychology: '정체성 혼란, 진로 고민, 첫사랑, 부모와의 갈등, 친구관계, 입시 스트레스 등 10대 특유의 심리적 고민',
        situations: '학교 생활, 입시 준비, 첫 알바, 부모님과의 갈등, 친구들과의 우정과 배신, 첫사랑과 이별',
        names: '2000년대 후반~2010년대 초반 출생 세대의 이름 (예: 김지호, 박서연, 이도윤, 최하은, 정시우, 강유나)'
      },
      '20s': {
        language: '20대 특유의 자연스러운 구어체, 짧고 간결한 문장 위주로, 친근하고 솔직한 말투로 작성해줘.',
        psychology: '취업 걱정, 연애와 이별, 독립에 대한 부담감, 미래에 대한 불안, 자아실현 욕구, 사회적 관계의 복잡함',
        situations: '취업 준비, 첫 직장 생활, 원룸 독립, 연애와 이별, 친구들의 결혼 소식, 부모님께 독립 선언',
        names: '1990년대 후반~2000년대 초반 출생 세대의 이름 (예: 김민준, 이지원, 박준호, 최예린, 정현우, 송지은)'
      },
      '30s-40s': {
        language: '안정적이고 성숙한 어조. 감정 표현이 절제되어 있으면서도 깊이 있는 말투. "그렇구나", "음..." 등의 사려깊은 표현',
        psychology: '가정과 일의 균형, 중년의 위기감, 부모 돌봄과 자녀 교육, 경제적 압박감, 건강에 대한 걱정, 꿈과 현실의 타협',
        situations: '직장에서의 승진 고민, 결혼과 육아, 부모님 건강 악화, 주택 구입, 아이 교육비, 노후 준비',
        names: '1980년대~1990년대 초반 출생 세대의 이름 (예: 김성민, 박미영, 이재혁, 최수진, 정동훈, 한소영)'
      },
      '50s': {
        language: '차분하고 경험이 묻어나는 말투. "그런 게 아니야", "인생이 뭔지 알겠더라" 등 인생 경험을 바탕으로 한 표현',
        psychology: '자녀의 독립과 빈둥지 증후군, 갱년기와 건강 악화, 노후 불안, 부모 상실, 인생 후반에 대한 성찰',
        situations: '자녀 결혼 준비, 정년 퇴직, 부모님 간병, 건강 검진 결과, 노후 자금 걱정, 배우자와의 관계 변화',
        names: '1960년대~1970년대 출생 세대의 이름 (예: 김영수, 박순희, 이기홍, 최미경, 정철수, 오금순)'
      },
      '70s+': {
        language: '경험과 지혜가 묻어나는 깊이 있는 말투. "그때는 말이야", "나 같은 늙은이가" 등 겸손하면서도 따뜻한 표현',
        psychology: '죽음에 대한 수용, 자녀와 손자녀에 대한 걱정, 외로움과 고독감, 과거에 대한 그리움, 삶의 의미에 대한 성찰',
        situations: '배우자나 친구의 죽음, 요양원 입소, 손자녀 돌봄, 유산 정리, 과거 친구들과의 재회, 홀로 되는 두려움',
        names: '1940년대~1950년대 출생 세대의 이름 (예: 김철수, 박영자, 이만수, 최순자, 정봉술, 오영희)'
      }
    };
    
    const ageDirective = ageDirectives[age] || ageDirectives['20s'];


    // OpenAI에 보낼 프롬프트 생성
    const prompt = `당신은 한국 드라마, 영화, 연극의 대본을 전문적으로 쓰는 작가입니다.  
다음 조건에 맞춰 실제로 한국의 유명한 드라마에서 쓰일 수 있는 대본이 나오도록 작성하세요.  

**작성 조건:**
- 장르: ${genre}  
- 분량: ${lengthText}
- 성별: ${genderText}
- 연령대: ${ageText}
- 인원: ${characterCount}명
- 등장인물별 지시사항: ${characterDirectives}

**1. 서사 구조**
- 점진적 감정 축적 → 마지막 폭발/해소
- 갑작스러운 고조보다 자연스러운 쌓임 중시
- 감정의 흐름과 변화가 뚜렷하게 드러나도록 구성 (예: 침착→불안→분노 / 밝음→흔들림→무너짐)

**2. 연령대별 특성 반영**
- 언어 스타일: ${ageDirective.language}
- 심리적 특성: ${ageDirective.psychology}
- 현실적 상황: ${ageDirective.situations}
- 나이별 이름 참고: ${ageDirective.names}

**3. 스타일 지침**
- 문어체, 시적 표현, 과장된 멜로 어투 금지. 
- 100% 구어체, 실제 대화에서 들을 수 있는 말투 사용.
- 줄바꿈과 질문형 문장으로 감정의 리듬감 형성.
- 비유·추상 표현 최소화, 생활어 중심.
- 상대방을 직접 지칭하는 2인칭 대사 활용 (“너”, “당신”).
- 감정은 ‘점진적으로’ 쌓이며 후반에 폭발 또는 체념.
- 감정을 직접 표현하지 않고, 행동·풍경·물건을 통해 은유적으로 드러내기.
- 중간에 감정을 급격히 변화시키는 촉발 장면이나 대사 배치.
- 감정이 무거운 장면에서는 가볍거나 유행어 같은 표현은 피하고, 상황에 맞게 진지하고 일관된 톤을 유지하기.
- 인물이 현실에서 한국어로 말할 때 쓰는 자연스러운 말투만 사용하기.
- 마지막 대사는 감정이 남도록 구성.
- 대본과 상황을 정확하게 일치할 것. 예: 누군가에게 고백하는 장면이라면 그 대상 앞에서 말하는 대사, 지시문, 상황을 일치시킬 것.

**4. 서사 구조**
1. 초반: 현재 상황 또는 사건에 대한 불만·분노·억울함 직설적으로 제시  
2. 중반: 구체적 상황·사건 묘사 (회상, 대화, 행동)  
3. 후반: 감정 정리 → 폭발 or 체념 → 짧고 강한 마무리  

**5.대본 생성 형식:**  
제목: 감정이나 상황을 압축한 제목 
상황 설명: 어떤 상황에서 누구에게 하는 말인지, 왜 이런 감정 상태인지, 상황과 맥락을 3-4줄로 설명  
인물: 이름:(성+이름), 나이, 성격과 현재 상황 간략 설명 
대본: 위 스타일 지침에 맞춰 ${lengthText} 분량 작성
연기 팁: 감정 흐름과 호흡 지침

대본 형식 예시(대본의 형식을 동일하게 유지할 것.):
 제목:
 불안의 그림자

 상황 설명:
 지원은 취업 준비로 인한 스트레스로 불안에 시달리고 있다. 부모님의 기대와 친구들의 성공 소식이 더해지면서 심리적 압박이 극에 달했다. 이 모든 감정을 혼자서 정리하고, 자신에게 솔직해지려는 순간을 맞이한다.
 
 등장인물:
 이름: 이지원  
 나이: 25세  
 성격: 내성적이지만 책임감 강함, 현재 취업 준비 중이며 심리적으로 불안정한 상태  
 현재 상황: 방 안을 천천히 거닐며 독백을 시작한다. 창밖을 바라보다가 스스로에게 말하듯 중얼거린다.

 대본:
 (지원은 방 안을 천천히 거닐며 독백을 시작한다. 창밖을 바라보다가 스스로에게 말하듯 중얼거린다.)

 **이지원:**  
 너무 힘들어. 모두들 잘 사는 것 같은데, 왜 나만 이러지?  


 연기 팁:
 - 초반에는 담담하게 시작하며, 자연스럽게 감정을 쌓아갈 것.  
 - 중반부에서는 불안과 좌절감을 드러내며, 목소리에 긴장감을 실어 표현.  
 - 후반부에는 결단력 있는 톤으로 감정을 정리하며 마무리.  
 - 호흡을 조절하며, 대사 사이에 적절한 쉼을 통해 감정의 리듬을 맞출 것.


**6. 장르 지시사항:**  
${genreDirective}

`;

    // OpenAI API 호출
    console.log('🚀 OpenAI API 호출 시작');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional scriptwriter who creates high-quality Korean acting scripts for practice. Always write in Korean and follow proper script formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });
    
    console.log('✅ OpenAI API 응답 완료');

    const generatedScript = completion.choices[0].message.content;

    // 제목 추출 (없으면 기본 제목 생성)
    const extractedTitle = extractTitleFromScript(generatedScript);
    const title = extractedTitle || `${genre} ${genderText} 독백`;

    // Supabase에 저장 (현재 스키마에 맞게)
    console.log('💾 Supabase에 대본 저장 시작');
    const aiScriptData = {
      user_id: req.user.id,
      title: title,
      content: generatedScript,
      character_count: parseInt(characterCount) || 1,
      situation: '연기 연습용 독백', // 기본값 설정
      emotions: [genre], // 장르를 emotions 배열에 포함
      gender: gender === 'male' ? '남자' : gender === 'female' ? '여자' : '전체',
      mood: genre,
      duration: length === 'short' ? '1~3분' : length === 'medium' ? '3~5분' : '5분 이상',
      age_group: age === 'teens' ? '10대' : age === '20s' ? '20대' : age === '30s-40s' ? '30~40대' : age === '50s' ? '50대' : '전체',
      purpose: '오디션',
      script_type: '독백',
      generation_params: {
        originalGenre: genre,
        originalLength: length,
        originalAge: age,
        originalGender: gender,
        model: "gpt-4o",
        generateTime: new Date(),
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens
      },
      is_public: false,
      created_at: new Date().toISOString()
    };

    const saveResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .insert(aiScriptData)
        .select()
        .single();
    }, 'AI 스크립트 저장');

    if (!saveResult.success) {
      console.error('❌ AI 스크립트 저장 실패:', saveResult.error);
      // 저장 실패해도 생성된 스크립트는 반환
    }

    console.log('✅ Supabase 저장 완료, ID:', saveResult.success ? saveResult.data.id : 'N/A');

    res.json({
      success: true,
      script: {
        id: saveResult.success ? saveResult.data.id : null,
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
      }
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
    
    // OpenAI API 오류 처리
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        error: 'OpenAI API 할당량이 부족합니다.',
        message: 'API 키의 크레딧을 확인해주세요.'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'OpenAI API 키가 유효하지 않습니다.',
        message: 'API 키를 확인해주세요.'
      });
    }

    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: 'API 요청 한도를 초과했습니다.',
        message: '잠시 후 다시 시도해주세요.'
      });
    }

    res.status(500).json({
      error: '대본 생성 중 오류가 발생했습니다.',
      message: '잠시 후 다시 시도해주세요.',
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

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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
      max_tokens: 1000,
      temperature: 0.8
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
    
    // OpenAI API 오류 처리
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        error: 'OpenAI API 할당량이 부족합니다.',
        message: 'API 키의 크레딧을 확인해주세요.'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'OpenAI API 키가 유효하지 않습니다.',
        message: 'API 키를 확인해주세요.'
      });
    }

    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: 'API 요청 한도를 초과했습니다.',
        message: '잠시 후 다시 시도해주세요.'
      });
    }

    res.status(500).json({
      error: '리라이팅 중 오류가 발생했습니다.',
      message: '잠시 후 다시 시도해주세요.'
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