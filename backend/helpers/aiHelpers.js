const { MODEL_DRAFT, MODEL_FINAL, TEMPERATURE_DRAFT, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../config/ai');

// 모델�??�규?? gpt-5 ?�용???�선?�로 ?��?
function normalizeModelName(name) {
  const raw = (name || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return 'gpt-5';
  if (lower === 'gpt5') return 'gpt-5';
  return raw;
}

function getGenreDirective(genre) {
  return ({
    '로맨??: '감정?�인 교감�?로맨?�한 분위기�? 강조?�고, 캐릭??간의 미묘??감정 변?��? ?�세?�게 ?�현?�줘.',
    '비극': '깊�? 갈등�?비극???�명???�루�? ?�물???�면??고뇌?� ?�픔??진중?�게 ?�현?�줘.',
    '코�???: '?�머?�스?�고 경쾌??분위기�? ?��??�며, ?�치 ?�는 ?�?��? ?�황??만들?�줘.',
    '?�릴??: '긴장�??�는 분위기�? ?�측불�????�개�?긴장감을 지?�시켜줘.',
    '?�션': '?�이?��??�고 ??��?�인 ?�면???�출?�며, ?�릴 ?�치???�션 ?�퀀?��? ?�함?�줘.',
    '공포': '?�뜩?�고 불안??분위기�? 조성?�며, 공포감을 ?�아?�는 ?�황??만들?�줘.',
    '?��?지': '?�상?�이�?마법?�인 ?�계관??바탕?�로 ?�상???�치???�정???�용?�줘.',
    'SF': '미래?�이�?과학?�인 ?�정???�용?�여 기술�??�간??관계�? ?�구?�줘.',
    '?��?�?: '?�당 ?��???배경�?문화�?고증?�여 ?��????�색?????�려�?'
  }[genre]) || '?�택???�르??맞게 ?�과 분위기�? ?��??�줘.';
}

function parseOpenAIError(err) {
  const status = err.status || err.response?.status;
  const type = err.type || err.response?.data?.error?.type || err.code;
  const message = err.message || err.response?.data?.error?.message;

  if (type === 'insufficient_quota' || status === 402) {
    return { http: 402, code: 'insufficient_quota', msg: 'OpenAI API ?�당?�이 부족합?�다. ?�레?�을 ?�인?�주?�요.' };
  }
  if (type === 'invalid_api_key' || status === 401) {
    return { http: 401, code: 'invalid_api_key', msg: 'OpenAI API ?��? ?�효?��? ?�습?�다.' };
  }
  if (status === 429 || type === 'rate_limit_exceeded') {
    return { http: 429, code: 'rate_limit_exceeded', msg: 'API ?�청 ?�도�?초과?�습?�다. ?�시 ???�시 ?�도?�주?�요.' };
  }
  if (type === 'unsupported_parameter' || type === 'invalid_request_error') {
    return { http: 400, code: 'invalid_request', msg: 'API ?�청 ?�식???�류가 ?�습?�다. ?�시 ???�시 ?�도?�주?�요.' };
  }
  return { http: 500, code: 'server_error', msg: '?��??�성 �??�류가 발생?�습?�다. ?�시 ???�시 ?�도?�주?�요.' };
}

async function callOpenAIWithRetry(openai, messages, options, { tries = 3, base = 180000 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      // Promise.race�??�용???�?�아??구현
      const timeoutMs = base + i * 60000; // 180s, 240s, 300s
      const modelName = normalizeModelName((options && options.model) || MODEL_FINAL);
      const temperature = (options && options.temperature) ?? TEMPERATURE_FINAL;
      const maxTokens = (options && (options.max_output_tokens || options.max_tokens || options.max_completion_tokens)) ?? MAX_COMPLETION_TOKENS;

      let apiCall;
      if (modelName.toLowerCase().startsWith('gpt-5')) {
        // gpt-5: Responses API ?�용
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
          // Responses API ?�스???�전 추출
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
      // �??�답 방�?: content가 비었?�면 ?�시???�리�?      try {
        const text = result?.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.trim().length === 0) {
          console.warn('[AI] �??�답 감�? ???�시???�도');
          throw new Error('Empty AI response');
        }
      } catch (e) {
        // choices 구조가 ?�으�?그�?�?반환(?�위?�서 처리)
      }
      return result;
    } catch (e) {
      console.log(`API ?�출 ?�도 ${i + 1}/${tries} ?�패:`, e.message);
      
      if (i === tries - 1) throw e;
      
      const status = e.status || e.response?.status;
      const type = e.type || e.response?.data?.error?.type || e.code;
      const isRetriable = [429, 500, 502, 503, 504].includes(status) || e.message === 'Request timeout';
      
      // ?�라미터 ?�류???�청 ?�식 ?�류???�시?�하지 ?�음
      if (type === 'unsupported_parameter' || type === 'invalid_request_error' || status === 400) {
        throw e;
      }
      
      if (!isRetriable) throw e;
      
      // 지??백오?�로 ?��?
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`${delay}ms ???�시??..`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function logRequestData(req) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('?�� ?�청 ?�이??개발):', req.body);
  } else {
    const { characterCount, genre, length, gender, age } = req.body || {};
    console.log('?�� ?�청 ?�약(?�영):', { characterCount, genre, length, gender, age });
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

