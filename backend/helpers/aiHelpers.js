const { MODEL_DRAFT, MODEL_FINAL, TEMPERATURE_DRAFT, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../config/ai');

// 모델명 정규화: gpt-5 사용을 우선으로 유지
function normalizeModelName(name) {
  const raw = (name || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return 'gpt-5';
  if (lower === 'gpt5') return 'gpt-5';
  return raw;
}

function getGenreDirective(genre) {
  return ({
    '로맨스': '감정적인 교감과 로맨틱한 분위기를 강조하고, 캐릭터 간의 미묘한 감정 변화를 섬세하게 표현해줘.',
    '비극': '깊은 갈등과 비극적 운명을 다루며, 인물의 내면적 고뇌와 슬픔을 진중하게 표현해줘.',
    '코미디': '유머러스하고 경쾌한 분위기를 유지하며, 재치 있는 대화와 상황을 만들어줘.',
    '스릴러': '긴장감 있는 분위기와 예측불가한 전개로 긴장감을 지속시켜줘.',
    '액션': '다이나믹하고 역동적인 장면을 연출하며, 스릴 넘치는 액션 시퀀스를 포함해줘.',
    '공포': '섬뜩하고 불안한 분위기를 조성하며, 공포감을 자아내는 상황을 만들어줘.',
    '판타지': '환상적이고 마법적인 세계관을 바탕으로 상상력 넘치는 설정을 활용해줘.',
    'SF': '미래적이고 과학적인 설정을 활용하여 기술과 인간의 관계를 탐구해줘.',
    '시대극': '해당 시대의 배경과 문화를 고증하여 시대적 특색을 잘 살려줘.'
  }[genre]) || '선택한 장르에 맞게 톤과 분위기를 유지해줘.';
}

function parseOpenAIError(err) {
  const status = err.status || err.response?.status;
  const type = err.type || err.response?.data?.error?.type || err.code;
  const message = err.message || err.response?.data?.error?.message;

  if (type === 'insufficient_quota' || status === 402) {
    return { http: 402, code: 'insufficient_quota', msg: 'OpenAI API 할당량이 부족합니다. 크레딧을 확인해주세요.' };
  }
  if (type === 'invalid_api_key' || status === 401) {
    return { http: 401, code: 'invalid_api_key', msg: 'OpenAI API 키가 유효하지 않습니다.' };
  }
  if (status === 429 || type === 'rate_limit_exceeded') {
    return { http: 429, code: 'rate_limit_exceeded', msg: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' };
  }
  if (type === 'unsupported_parameter' || type === 'invalid_request_error') {
    return { http: 400, code: 'invalid_request', msg: 'API 요청 형식에 오류가 있습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { http: 500, code: 'server_error', msg: '대본 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
}

async function callOpenAIWithRetry(openai, messages, options, { tries = 3, base = 180000 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      // Promise.race를 사용한 타임아웃 구현
      const timeoutMs = base + i * 60000; // 180s, 240s, 300s
      const modelName = normalizeModelName((options && options.model) || MODEL_FINAL);
      const temperature = (options && options.temperature) ?? TEMPERATURE_FINAL;
      const maxTokens = (options && (options.max_output_tokens || options.max_tokens || options.max_completion_tokens)) ?? MAX_COMPLETION_TOKENS;

      let apiCall;
      if (modelName.toLowerCase().startsWith('gpt-5')) {
        // gpt-5: Responses API 사용
        const toText = (m) => {
          if (typeof m === 'string') return m;
          if (!m) return '';
          const role = m.role ? m.role.toUpperCase() : 'USER';
          if (typeof m.content === 'string') return `[${role}]\n${m.content}`;
          if (Array.isArray(m.content)) {
            const joined = m.content.map(c => typeof c === 'string' ? c : (c?.text || '')).join('\n');
            return `[${role}]\n${joined}`;
          }
          return `[${role}]`;
        };
        const inputText = Array.isArray(messages) ? messages.map(toText).join('\n\n') : String(messages || '');
        apiCall = openai.responses.create({
          model: modelName,
          input: inputText,
          temperature,
          max_output_tokens: maxTokens,
        }).then(r => {
          // Responses API 텍스트 안전 추출
          let text = '';
          if (r && typeof r.output_text === 'string' && r.output_text.length > 0) {
            text = r.output_text;
          } else if (Array.isArray(r.output)) {
            try {
              const parts = [];
              for (const item of r.output) {
                if (Array.isArray(item?.content)) {
                  for (const c of item.content) {
                    if (typeof c?.text?.value === 'string') parts.push(c.text.value);
                    else if (typeof c?.text === 'string') parts.push(c.text);
                  }
                }
              }
              text = parts.join('\n').trim();
            } catch (_) {
              text = '';
            }
          }
          return { choices: [{ message: { content: text } }] };
        });
      } else {
        // 기존 Chat Completions 경로
        const payload = {
          model: modelName,
          messages: messages,
          temperature,
          max_tokens: maxTokens,
        };
        apiCall = openai.chat.completions.create(payload);
      }
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      );
      
      const result = await Promise.race([apiCall, timeoutPromise]);
      // 빈 응답 방지: content가 비었으면 재시도 트리거
      try {
        const text = result?.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.trim().length === 0) {
          console.warn('[AI] 빈 응답 감지 – 재시도 시도');
          throw new Error('Empty AI response');
        }
      } catch (e) {
        // choices 구조가 없으면 그대로 반환(상위에서 처리)
      }
      return result;
    } catch (e) {
      console.log(`API 호출 시도 ${i + 1}/${tries} 실패:`, e.message);
      
      if (i === tries - 1) throw e;
      
      const status = e.status || e.response?.status;
      const type = e.type || e.response?.data?.error?.type || e.code;
      const isRetriable = [429, 500, 502, 503, 504].includes(status) || e.message === 'Request timeout';
      
      // 파라미터 오류나 요청 형식 오류는 재시도하지 않음
      if (type === 'unsupported_parameter' || type === 'invalid_request_error' || status === 400) {
        throw e;
      }
      
      if (!isRetriable) throw e;
      
      // 지수 백오프로 대기
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`${delay}ms 후 재시도...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function logRequestData(req) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('📝 요청 데이터(개발):', req.body);
  } else {
    const { characterCount, genre, length, gender, age } = req.body || {};
    console.log('📝 요청 요약(운영):', { characterCount, genre, length, gender, age });
  }
}

module.exports = {
  getGenreDirective,
  parseOpenAIError,
  callOpenAIWithRetry,
  logRequestData,
  MODEL_DRAFT,
  MODEL_FINAL,
  TEMPERATURE_DRAFT,
  TEMPERATURE_FINAL,
  MAX_COMPLETION_TOKENS
};
