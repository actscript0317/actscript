const express = require('express');
const OpenAI = require('openai');
const config = require('../config/env');
const AIScript = require('../models/AIScript');
const { protect } = require('../middleware/auth');

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

  // 대본 생성 API
router.post('/generate', protect, async (req, res) => {
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

    const { characterCount, genre, length, location, gender } = req.body;

    // 입력값 검증
    if (!characterCount || !genre || !length || !gender) {
      return res.status(400).json({
        error: '모든 필드를 입력해주세요.',
        required: ['characterCount', 'genre', 'length', 'gender']
      });
    }

    // 길이 변환
    const lengthMap = {
      'short': '짧은 (1-2분)',
      'medium': '중간 길이 (3-5분)', 
      'long': '긴 (5-10분)'
    };

    const lengthText = lengthMap[length] || length;

    // 성별 처리
    const genderMap = {
      'male': '남성',
      'female': '여성',
      'random': '성별 자유롭게'
    };
    
    const genderText = genderMap[gender] || gender;
    
    const locationText = location?.trim() ? location : "자유롭게 설정";

    // 장르별 지시사항
    const genreDirectives = {
      '로맨스': 'Focus on tender emotions, heart-fluttering moments, and sincere dialogue.',
      '비극': 'Convey deep sorrow, irreversible loss, and emotionally devastating outcomes.',
      '코미디': 'Use light-hearted tone, comedic timing, and witty exchanges.',
      '스릴러': 'Build suspense with unexpected twists and fast-paced dialogue.',
      '액션': 'Include fast-paced, dynamic scenes with urgent dialogue and physical tension.',
      '공포': 'Create an eerie mood with unsettling descriptions and tense interactions.',
      '판타지': 'Incorporate magical elements, fantastical settings, and imaginative conflicts.',
      'SF': 'Base the story on futuristic or scientific concepts, with logical consistency.',
      '시대극': 'Use historically appropriate language and cultural context.',
    }[genre] || 'Keep the tone consistent with the selected genre.';


    // 등장인물별 지시사항
    const characterDirectivesMap = {
      '1': `독백 전용 작성 가이드:
- 감정의 흐름과 변화가 뚜렷하게 드러나도록 구성 (예: 침착→불안→분노 / 밝음→흔들림→무너짐)
- 자기 고백형 서사로 내면의 솔직한 이야기를 담기
- 실제 말할 법한 현실적인 말투 사용 (연극적이지 않게)
- 선택한 분량에 맞게 감정을 점진적으로 쌓아 올려 마지막에 터뜨리기
- 10대 후반~20대 초반이 공감할 수 있는 주제 우선 고려 (가족 문제, 꿈에 대한 불안, 자존감, 친구 관계, 외로움, 실패 등)`,
      '2-3': 'Structure natural dialogue flow between 2-3 characters.',
      '4+': 'Write to show interactions among 4 or more characters.'
    };
    
    const characterDirectives = characterDirectivesMap[characterCount] || 'Structure dialogue appropriate for the number of characters.';

    // 장소별 지시사항
    const locationDirective = (() => {
      const locationMap = {
        '카페': 'Describe to feel the cafe atmosphere and ambient noise.',
        '병원': 'Reflect the quiet and tense atmosphere of a hospital.',
        '거리': 'Express outdoor atmosphere with car sounds, footsteps, etc.',
        '경찰서': 'Reflect the rigid atmosphere and speech patterns of police/suspects.',
        '학교': 'Naturally incorporate students\' daily life and classroom atmosphere.',
        '집': 'Include the private atmosphere of home and small details.',
        '사무실': 'Reflect professional workplace atmosphere and formal speech.',
        '공원': 'Include natural outdoor setting with peaceful or lively atmosphere.',
        '버스': 'Show confined space with background noise and passenger interactions.',
        '지하철': 'Reflect urban transit atmosphere with announcements and crowd sounds.'
      };
      return locationMap[location] || `Include atmospheric descriptions suitable for ${location} setting.`;
    })();

    // OpenAI에 보낼 프롬프트 생성
    const prompt = `당신은 한국에서 활동하는 전문 독백 작가입니다.
연기 입시, 오디션, 연기 학원에서 사용되는 고품질 독백 대본을 전문적으로 작성합니다.
감정의 흐름과 변화가 뚜렷하고, 실제 연기자가 몰입할 수 있는 현실적인 독백을 만드는 것이 특기입니다.

**작성 조건:**
- 장르: ${genre}  
- 분량: ${lengthText}
- 배경: ${locationText}
- 성별: ${genderText}

—

**🎭 독백 전용 작성 가이드:**

**1. 감정 흐름 설계**
${characterDirectives}

**2. 서사 구조**
- 자기 고백형 서사로 내면의 진솔한 이야기
- 점진적 감정 축적 → 마지막 폭발/해소
- 갑작스러운 고조보다 자연스러운 쌓임 중시

**3. 언어 스타일**
- 실제 말할 법한 현실적 말투 (연극적 X)
- 10대 후반~20대 초반 어휘와 표현
- 감정에 따른 자연스러운 말투 변화
- 침묵, 망설임, 한숨 등의 자연스러운 활용

**⚠️ 대사 작성 금지 사항:**
- 오글거리거나 인위적인 말버릇 사용 금지 ("이런...", "그냥...", "있잖아...", "하...", "나… 나 진짜…" 등)
- 감정을 억지로 끌어내는 감탄사나 멜로 클리셰 표현 피하기
- 멜로 드라마틱한 과장된 표현 대신 현실적이고 설득력 있는 말로 작성
- 문어체/시적인 표현 금지 ("너의 방문을 기다리며", "하늘은 오늘도 흐리다" 등)
- 명사형 표현 대신 동사 중심 문장 사용 ("사랑의 기억" ❌ → "그때 사랑했던 순간이 아직도 생생해" ✅)
- **어색하고 비현실적인 종결어미 절대 금지**: "없길...", "있길...", "되길...", "하길...", "좋길..." 등
- **실제 사람이 쓰는 자연스러운 종결어미 사용**: "없어", "있어", "돼", "해", "그래", "아니야", "맞아" 등

**✅ 자연스러운 말투 지침:**
- 실제 사람의 말투처럼 망설임, 말끊김, 솔직한 감정 표현
- 예시: "근데... 진짜 무서웠어", "나도 몰랐어, 내가 이렇게 될 줄은"
- 감정선 흐름은 유지하되, 대사 구조를 명확하고 밀도 있게 구성

**🎭 독백 시 말투 및 상황 설정 필수 지침:**
- **누구에게 말하는 독백인지 명확히 설정** (혼잣말 vs 특정 상대방에게)

**📝 독백 결과 형식:**

**제목:** (감정이나 상황을 압축한 제목)

**상황 설명:**
(어떤 상황에서 누구에게 하는 말인지, 왜 이런 감정 상태인지 3-4줄로 설명)

**인물:**
이름: (20세, 대학생/고3 등, 성격과 현재 상황 간략 설명)

**독백:**
(${lengthText} 분량의 독백 대사 - 감정 변화가 뚜렷하게 드러나도록 구성)

**연기 팁:**
- 감정 흐름: (예: 담담함 → 억울함 → 분노 → 체념)
- 주요 포인트: (연기 시 주의할 점이나 감정 표현 팁)
- 마무리: (마지막 대사의 감정 포인트)

—
위 형식으로 ${genre} 감정을 중심으로 한 독백을 작성해주세요.
연기자가 감정에 깊이 몰입할 수 있고, 실제 연기 현장에서 바로 활용 가능한 전문적인 독백을 완성해주세요.`;

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

    // MongoDB에 저장
    console.log('💾 MongoDB에 대본 저장 시작');
    const newScript = new AIScript({
      userId: req.user._id,
      title: title,
      content: generatedScript,
      characterCount,
      genre,
      length,
      gender,
      location: location || '',
      metadata: {
        model: "gpt-4o",
        generateTime: new Date(),
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens
      }
    });

    const savedScript = await newScript.save();
    console.log('✅ MongoDB 저장 완료, ID:', savedScript._id);

    res.json({
      success: true,
      script: generatedScript,
      scriptId: savedScript._id,
      title: title,
      metadata: {
        characterCount,
        genre,
        gender: genderText,
        length: lengthText,
        location: locationText,
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
router.get('/scripts', protect, async (req, res) => {
  try {
    const scripts = await AIScript.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('title content characterCount genre emotions length situation createdAt isSaved savedAt')
      .lean();

    res.json({
      success: true,
      scripts: scripts
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
router.get('/scripts/:id', protect, async (req, res) => {
  try {
    const script = await AIScript.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    }).lean();

    if (!script) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      script: script
    });
  } catch (error) {
    console.error('AI 스크립트 조회 오류:', error);
    res.status(500).json({
      error: '스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

// AI 스크립트를 대본함에 저장
router.put('/scripts/:id/save', protect, async (req, res) => {
  try {
    const script = await AIScript.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { 
        isSaved: true, 
        savedAt: new Date() 
      },
      { new: true }
    );

    if (!script) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '스크립트가 대본함에 저장되었습니다.',
      script: script
    });
  } catch (error) {
    console.error('AI 스크립트 저장 오류:', error);
    res.status(500).json({
      error: '스크립트 저장 중 오류가 발생했습니다.'
    });
  }
});

// AI 스크립트 삭제
router.delete('/scripts/:id', protect, async (req, res) => {
  try {
    const script = await AIScript.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!script) {
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

// 저장된 AI 스크립트 목록 조회 (대본함용)
router.get('/saved', protect, async (req, res) => {
  try {
    const savedScripts = await AIScript.find({ 
      userId: req.user._id, 
      isSaved: true 
    })
      .sort({ savedAt: -1 })
      .select('title content characterCount genre emotions length situation savedAt')
      .lean();

    res.json({
      success: true,
      scripts: savedScripts
    });
  } catch (error) {
    console.error('저장된 AI 스크립트 조회 오류:', error);
    res.status(500).json({
      error: '저장된 스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 