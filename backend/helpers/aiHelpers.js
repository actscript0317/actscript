const { MODEL_DRAFT, MODEL_FINAL, TEMPERATURE_DRAFT, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../config/ai');

// 모델명 정규화
function normalizeModelName(name) {
  const raw = (name || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return 'gpt-4o';
  if (lower === 'gpt5' || lower === 'gpt-5') return 'gpt-4o';
  return raw;
}

// 장르 지시문(선택적 사용) - 구문 오류 방지를 위해 간단화
function getGenreDirective(genre) {
  const map = {
    '로맨스': '잔잔한 감정의 흐름과 교감을 강조해줘.',
    '비극': '무거운 톤과 깊은 갈등, 절제된 표현을 유지해줘.',
    '코미디': '경쾌하고 유머러스한 상황과 대사를 활용해줘.',
    '스릴러': '긴장감과 불확실성을 유지하며 점진적으로 고조시켜줘.',
    '액션': '긴박한 전개와 명료한 지시문으로 속도감을 살려줘.',
    '공포': '불안과 공포감을 서서히 조성하고 여운을 남겨줘.',
    '판타지': '상상력과 세계관을 자연스럽게 녹여 현실감 있게 표현해줘.',
    'SF': '과학적 상상력과 기술적 디테일을 균형 있게 담아줘.',
    '사극': '시대 배경과 어휘를 고려해 격조 있는 말투로 써줘.'
  };
  return map[genre] || '선택한 장르에 맞는 톤과 분위기를 유지해줘.';
}

function parseOpenAIError(err) {
  const status = err?.status || err?.response?.status;
  const type = err?.type || err?.response?.data?.error?.type || err?.code;

  if (type === 'insufficient_quota' || status === 402) {
    return { http: 402, code: 'insufficient_quota', msg: 'OpenAI API 할당량이 부족합니다. 크레딧을 확인해주세요.' };
  }
  if (type === 'invalid_api_key' || status === 401) {
    return { http: 401, code: 'invalid_api_key', msg: 'OpenAI API 키가 유효하지 않습니다.' };
  }
  if (status === 429 || type === 'rate_limit_exceeded') {
    return { http: 429, code: 'rate_limit_exceeded', msg: 'API 요청 빈도가 높습니다. 잠시 후 다시 시도해주세요.' };
  }
  if (type === 'unsupported_parameter' || type === 'invalid_request_error' || status === 400) {
    return { http: 400, code: 'invalid_request', msg: 'API 요청 형식에 오류가 있습니다. 입력을 확인 후 다시 시도해주세요.' };
  }
  return { http: 500, code: 'server_error', msg: 'AI 생성 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
}

// Cloudflare/Render 게이트웨이 한계(~100s)를 고려하여 기본 타임아웃 60s, 필요 시 호출부에서 조정
async function callOpenAIWithRetry(openai, messages, options, { tries = 1, base = 60000 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const timeoutMs = base + i * 15000; // 60s, 75s
      const modelName = normalizeModelName((options && options.model) || MODEL_FINAL);
      const temperature = (options && options.temperature) ?? TEMPERATURE_FINAL;
      const maxTokens = (options && (options.max_output_tokens || options.max_tokens || options.max_completion_tokens)) ?? MAX_COMPLETION_TOKENS;

      let apiCall;
      if (modelName.toLowerCase().startsWith('gpt-5')) {
        // gpt-5: Responses API 사용 (권장: instructions + input 문자열)
        const msgs = Array.isArray(messages) ? messages : [messages];
        let instructions = '';
        const textParts = [];
        for (const m of msgs) {
          if (!m) continue;
          const content = Array.isArray(m.content)
            ? m.content.map(c => (typeof c === 'string' ? c : (c?.text || ''))).join('\n')
            : (typeof m.content === 'string' ? m.content : (m?.toString?.() || ''));
          if ((m.role || '').toLowerCase() === 'system') {
            instructions += (instructions ? '\n\n' : '') + content;
          } else {
            // 간단한 구분자 포함해 맥락 유지
            const label = (m.role || 'user').toUpperCase();
            textParts.push(`[${label}]\n${content}`);
          }
        }
        const inputText = textParts.join('\n\n');

        apiCall = openai.responses.create({
          model: modelName,
          input: inputText,
          ...(instructions && { instructions }),
          temperature,
          max_output_tokens: maxTokens,
        }).then(r => {
          let text = '';
          if (typeof r?.output_text === 'string' && r.output_text.length > 0) {
            text = r.output_text;
          } else if (Array.isArray(r?.output)) {
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

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      const result = await Promise.race([apiCall, timeoutPromise]);

      // 빈 응답 방지: content가 비면 재시도 유도
      try {
        const text = result?.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.trim().length === 0) {
          throw new Error('Empty AI response');
        }
      } catch (_) {}

      return result;
    } catch (e) {
      if (i === tries - 1) throw e;
      const status = e?.status || e?.response?.status;
      const type = e?.type || e?.response?.data?.error?.type || e?.code;
      const isRetriable = [429, 500, 502, 503, 504].includes(status) || e?.message === 'Request timeout' || e?.message === 'Empty AI response';
      if (type === 'unsupported_parameter' || type === 'invalid_request_error' || status === 400) {
        throw e; // 비재시도 오류
      }
      if (!isRetriable) throw e;
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function logRequestData(req) {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('요청 데이터(개발):', req.body);
    } else {
      const { characterCount, genre, length, gender, age } = req.body || {};
      console.log('요청 요약(운영):', { characterCount, genre, length, gender, age });
    }
  } catch (_) {}
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
