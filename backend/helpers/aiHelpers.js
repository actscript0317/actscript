const { MODEL_DRAFT, MODEL_FINAL, TEMPERATURE_DRAFT, TEMPERATURE_FINAL, MAX_COMPLETION_TOKENS } = require('../config/ai');

// ëª¨ë¸ëª??•ê·œ?? gpt-5 ?¬ìš©???°ì„ ?¼ë¡œ ? ì?
function normalizeModelName(name) {
  const raw = (name || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return 'gpt-5';
  if (lower === 'gpt5') return 'gpt-5';
  return raw;
}

function getGenreDirective(genre) {
  return ({
    'ë¡œë§¨??: 'ê°ì •?ì¸ êµê°ê³?ë¡œë§¨?±í•œ ë¶„ìœ„ê¸°ë? ê°•ì¡°?˜ê³ , ìºë¦­??ê°„ì˜ ë¯¸ë¬˜??ê°ì • ë³€?”ë? ?¬ì„¸?˜ê²Œ ?œí˜„?´ì¤˜.',
    'ë¹„ê·¹': 'ê¹Šì? ê°ˆë“±ê³?ë¹„ê·¹???´ëª…???¤ë£¨ë©? ?¸ë¬¼???´ë©´??ê³ ë‡Œ?€ ?¬í””??ì§„ì¤‘?˜ê²Œ ?œí˜„?´ì¤˜.',
    'ì½”ë???: '? ë¨¸?¬ìŠ¤?˜ê³  ê²½ì¾Œ??ë¶„ìœ„ê¸°ë? ? ì??˜ë©°, ?¬ì¹˜ ?ˆëŠ” ?€?”ì? ?í™©??ë§Œë“¤?´ì¤˜.',
    '?¤ë¦´??: 'ê¸´ì¥ê°??ˆëŠ” ë¶„ìœ„ê¸°ì? ?ˆì¸¡ë¶ˆê????„ê°œë¡?ê¸´ì¥ê°ì„ ì§€?ì‹œì¼œì¤˜.',
    '?¡ì…˜': '?¤ì´?˜ë??˜ê³  ??™?ì¸ ?¥ë©´???°ì¶œ?˜ë©°, ?¤ë¦´ ?˜ì¹˜???¡ì…˜ ?œí€€?¤ë? ?¬í•¨?´ì¤˜.',
    'ê³µí¬': '?¬ëœ©?˜ê³  ë¶ˆì•ˆ??ë¶„ìœ„ê¸°ë? ì¡°ì„±?˜ë©°, ê³µí¬ê°ì„ ?ì•„?´ëŠ” ?í™©??ë§Œë“¤?´ì¤˜.',
    '?í?ì§€': '?˜ìƒ?ì´ê³?ë§ˆë²•?ì¸ ?¸ê³„ê´€??ë°”íƒ•?¼ë¡œ ?ìƒ???˜ì¹˜???¤ì •???œìš©?´ì¤˜.',
    'SF': 'ë¯¸ë˜?ì´ê³?ê³¼í•™?ì¸ ?¤ì •???œìš©?˜ì—¬ ê¸°ìˆ ê³??¸ê°„??ê´€ê³„ë? ?êµ¬?´ì¤˜.',
    '?œë?ê·?: '?´ë‹¹ ?œë???ë°°ê²½ê³?ë¬¸í™”ë¥?ê³ ì¦?˜ì—¬ ?œë????¹ìƒ‰?????´ë ¤ì¤?'
  }[genre]) || '? íƒ???¥ë¥´??ë§ê²Œ ?¤ê³¼ ë¶„ìœ„ê¸°ë? ? ì??´ì¤˜.';
}

function parseOpenAIError(err) {
  const status = err.status || err.response?.status;
  const type = err.type || err.response?.data?.error?.type || err.code;
  const message = err.message || err.response?.data?.error?.message;

  if (type === 'insufficient_quota' || status === 402) {
    return { http: 402, code: 'insufficient_quota', msg: 'OpenAI API ? ë‹¹?‰ì´ ë¶€ì¡±í•©?ˆë‹¤. ?¬ë ˆ?§ì„ ?•ì¸?´ì£¼?¸ìš”.' };
  }
  if (type === 'invalid_api_key' || status === 401) {
    return { http: 401, code: 'invalid_api_key', msg: 'OpenAI API ?¤ê? ? íš¨?˜ì? ?ŠìŠµ?ˆë‹¤.' };
  }
  if (status === 429 || type === 'rate_limit_exceeded') {
    return { http: 429, code: 'rate_limit_exceeded', msg: 'API ?”ì²­ ?œë„ë¥?ì´ˆê³¼?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.' };
  }
  if (type === 'unsupported_parameter' || type === 'invalid_request_error') {
    return { http: 400, code: 'invalid_request', msg: 'API ?”ì²­ ?•ì‹???¤ë¥˜ê°€ ?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.' };
  }
  return { http: 500, code: 'server_error', msg: '?€ë³??ì„± ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.' };
}

async function callOpenAIWithRetry(openai, messages, options, { tries = 3, base = 180000 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      // Promise.raceë¥??¬ìš©???€?„ì•„??êµ¬í˜„
      const timeoutMs = base + i * 60000; // 180s, 240s, 300s
      const modelName = normalizeModelName((options && options.model) || MODEL_FINAL);
      const temperature = (options && options.temperature) ?? TEMPERATURE_FINAL;
      const maxTokens = (options && (options.max_output_tokens || options.max_tokens || options.max_completion_tokens)) ?? MAX_COMPLETION_TOKENS;

      let apiCall;
      if (modelName.toLowerCase().startsWith('gpt-5')) {
        // gpt-5: Responses API ?¬ìš©
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
          // Responses API ?ìŠ¤???ˆì „ ì¶”ì¶œ
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
        // ê¸°ì¡´ Chat Completions ê²½ë¡œ
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
      // ë¹??‘ë‹µ ë°©ì?: contentê°€ ë¹„ì—ˆ?¼ë©´ ?¬ì‹œ???¸ë¦¬ê±?      try {
        const text = result?.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.trim().length === 0) {
          console.warn('[AI] ë¹??‘ë‹µ ê°ì? ???¬ì‹œ???œë„');
          throw new Error('Empty AI response');
        }
      } catch (e) {
        // choices êµ¬ì¡°ê°€ ?†ìœ¼ë©?ê·¸ë?ë¡?ë°˜í™˜(?ìœ„?ì„œ ì²˜ë¦¬)
      }
      return result;
    } catch (e) {
      console.log(`API ?¸ì¶œ ?œë„ ${i + 1}/${tries} ?¤íŒ¨:`, e.message);
      
      if (i === tries - 1) throw e;
      
      const status = e.status || e.response?.status;
      const type = e.type || e.response?.data?.error?.type || e.code;
      const isRetriable = [429, 500, 502, 503, 504].includes(status) || e.message === 'Request timeout';
      
      // ?Œë¼ë¯¸í„° ?¤ë¥˜???”ì²­ ?•ì‹ ?¤ë¥˜???¬ì‹œ?„í•˜ì§€ ?ŠìŒ
      if (type === 'unsupported_parameter' || type === 'invalid_request_error' || status === 400) {
        throw e;
      }
      
      if (!isRetriable) throw e;
      
      // ì§€??ë°±ì˜¤?„ë¡œ ?€ê¸?
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`${delay}ms ???¬ì‹œ??..`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function logRequestData(req) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('?“ ?”ì²­ ?°ì´??ê°œë°œ):', req.body);
  } else {
    const { characterCount, genre, length, gender, age } = req.body || {};
    console.log('?“ ?”ì²­ ?”ì•½(?´ì˜):', { characterCount, genre, length, gender, age });
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

