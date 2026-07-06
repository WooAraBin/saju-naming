// Vercel Serverless Function — Gemini 이름 해설
// 환경변수 GEMINI_KEY 필요 (Vercel 프로젝트 Settings → Environment Variables)
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.GEMINI_KEY;
  if (!key) { res.status(200).json({ text: '', note: 'GEMINI_KEY 미설정' }); return; }

  let body = '';
  await new Promise((r) => { req.on('data', (c) => (body += c)); req.on('end', r); });
  let prompt = '', image = null;
  try { const b = JSON.parse(body || '{}'); prompt = b.prompt || ''; image = b.image || null; } catch (e) {}
  if (!prompt) { res.status(400).json({ error: 'no prompt' }); return; }

  // 텍스트 + (선택) 이미지 — 관상 분석용 멀티모달
  const parts = [{ text: prompt }];
  if (image && image.data) {
    parts.push({ inlineData: { mimeType: image.mime || 'image/jpeg', data: image.data } });
  }

  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: 8192, temperature: 0.9, thinkingConfig: { thinkingBudget: 0 } },
        }) }
    );
    const j = await r.json();
    const text = j && j.candidates && j.candidates[0] && j.candidates[0].content
      && j.candidates[0].content.parts && j.candidates[0].content.parts[0]
      && j.candidates[0].content.parts[0].text || '';
    res.status(200).json({ text });
  } catch (e) {
    res.status(200).json({ text: '', error: String(e) });
  }
};
