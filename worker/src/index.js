// 키 체인저 — 사진 코드보 읽기 서버 (Cloudflare Worker)
// 앱이 보낸 사진을 Claude API에 넘겨 ChordPro 텍스트로 돌려준다.
// API 키는 브라우저에 노출되지 않도록 여기(서버)에만 둔다.

const PROMPT = `첨부한 이미지는 노래의 코드 악보(코드보/리드시트)입니다. 내용을 ChordPro 형식의 일반 텍스트로 정확히 옮겨 적어 주세요.

규칙:
- 첫 줄들에 알 수 있는 정보만: {title: 제목}, {artist: 아티스트}, 악보에 키가 적혀 있으면 {key: 키}
- 가사 위에 있는 코드는 그 코드가 놓인 음절 바로 앞에 대괄호로 넣기. 예: [G]햇살 내린 [D/F#]골목길을
- 가사 없이 코드만 있는 줄(전주, 간주 등)은 대괄호 없이 코드를 공백으로 구분해 한 줄로. 마디선 | 는 그대로 둬도 됨. 예: G  D/F#  Em  C | D
- 섹션 이름(Intro, Verse, Chorus, 전주, 후렴, 1절 등)은 따로 한 줄에 [Chorus] 처럼
- 코드 이름은 악보에 적힌 그대로(예: Cmaj7, F#m7b5, G/B). 추측해서 바꾸지 말 것
- 반복 기호나 메모는 짧게 텍스트로
- 여러 장이면 순서대로 이어서
- 이미지가 코드보나 악보가 아니면 정확히 NOT_A_CHORD_CHART 라고만 출력
- 설명이나 코드블록 없이 ChordPro 텍스트만 출력`;

const MAX_IMAGES = 4;
const MAX_IMAGE_B64 = 5 * 1024 * 1024;     // Claude API 이미지 한 장 한도
const MAX_BODY = 16 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function cors(origin, allowed) {
  const ok = origin && allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const origin = req.headers.get('Origin') || '';
    const h = cors(origin, allowed);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method !== 'POST') return json({ error: 'POST만 받아요' }, 405, h);
    if (!allowed.includes(origin)) return json({ error: '허용되지 않은 주소에서 온 요청이에요' }, 403, h);
    if (!env.ANTHROPIC_API_KEY) return json({ error: '서버에 API 키가 설정되지 않았어요' }, 500, h);

    // IP별 요청 제한 (wrangler.toml의 ratelimits 설정)
    if (env.OCR_LIMITER) {
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.OCR_LIMITER.limit({ key: ip });
      if (!success) return json({ error: '요청이 너무 많아요. 1분 뒤에 다시 시도해 주세요.' }, 429, h);
    }

    const len = +(req.headers.get('Content-Length') || 0);
    if (len > MAX_BODY) return json({ error: '사진 용량이 너무 커요' }, 413, h);

    let body;
    try { body = await req.json(); } catch { return json({ error: '잘못된 요청이에요' }, 400, h); }
    const images = Array.isArray(body && body.images) ? body.images : [];
    if (!images.length) return json({ error: '사진이 없어요' }, 400, h);
    if (images.length > MAX_IMAGES) return json({ error: `사진은 한 번에 ${MAX_IMAGES}장까지예요` }, 400, h);
    for (const im of images) {
      if (!im || !TYPES.has(im.media_type) || typeof im.data !== 'string' || !im.data.length || im.data.length > MAX_IMAGE_B64)
        return json({ error: '지원하지 않는 사진 형식이거나 너무 커요' }, 400, h);
    }

    const content = [
      ...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } })),
      { type: 'text', text: PROMPT },
    ];

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.MODEL || 'claude-sonnet-5-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.log('anthropic error', r.status, detail.slice(0, 500));
      const msg = r.status === 429 || r.status === 529 ? 'AI 서버가 바빠요. 잠시 후 다시 시도해 주세요.' : 'AI 서버 오류가 났어요.';
      return json({ error: msg }, 502, h);
    }
    const data = await r.json();
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    if (!text || text.includes('NOT_A_CHORD_CHART')) return json({ error: '코드보를 찾지 못했어요. 코드보 사진인지 확인해 주세요.' }, 422, h);
    return json({ text }, 200, h);
  },
};
