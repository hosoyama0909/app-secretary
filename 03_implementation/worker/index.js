// 秘書アプリ用 Gemini リレー Worker（v2: テキスト + 画像対応）
//
// アプリからのラフな会話文、または保証書などの写真を受け取り、
// Gemini に「カテゴリのフィールド定義に沿ったJSONを返して」と頼んで中継する。
// - APIキーはこの Worker の Secret にのみ置く（クライアントには一切渡さない）。
// - 画像はこの Worker を素通りするだけで保存しない。
// - 🔴機微情報（口座番号フル/暗証番号/カード番号/マイナンバー/パスワード）は
//   抽出しないようプロンプトで明示する。

const GEMINI_MODEL = 'gemini-flash-lite-latest';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'POST のみ対応しています。' }, 405);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ error: 'JSONの解析に失敗しました。' }, 400);
    }

    const { mode, fields, text, imageBase64, mimeType } = payload;
    if (mode !== 'extract' && mode !== 'extract-image') {
      return json({ error: 'mode は extract または extract-image を指定してください。' }, 400);
    }
    if (!Array.isArray(fields)) {
      return json({ error: 'fields が必要です。' }, 400);
    }
    if (mode === 'extract' && !text) {
      return json({ error: 'text が必要です。' }, 400);
    }
    if (mode === 'extract-image' && !imageBase64) {
      return json({ error: 'imageBase64 が必要です。' }, 400);
    }

    const prompt = buildPrompt(fields);
    const parts = [{ text: prompt }];
    if (mode === 'extract') {
      parts.push({ text: '入力文: ' + text });
    } else {
      parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: 'サーバ側にGEMINI_API_KEYが設定されていません。' }, 500);
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return json({ error: 'Gemini呼び出しに失敗しました: ' + errText.slice(0, 300) }, 502);
    }

    const geminiData = await geminiRes.json();
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return json({ error: 'Geminiから抽出結果を取得できませんでした。' }, 502);
    }

    let draft;
    try {
      draft = JSON.parse(raw);
    } catch (e) {
      return json({ error: '抽出結果のJSON解析に失敗しました。' }, 502);
    }

    return json(draft, 200);
  },
};

function buildPrompt(fields) {
  const fieldDesc = fields
    .map((f) => `- ${f.key}（${f.label}, 型:${f.type}${f.unit ? ', 単位:' + f.unit : ''}）`)
    .join('\n');
  return [
    '入力（会話文または画像）から、次のフィールドに該当する値を読み取り、JSONオブジェクトだけを返してください。',
    'フィールド定義:',
    fieldDesc,
    '',
    '追加で、期日らしき情報があれば "dates" 配列に {label, mode(once|yearly|interval), date(YYYY-MM-DD)} の形で含めてください。',
    '短い補足があれば "memo" に文字列で含めてください。',
    '',
    '重要な制約:',
    '- 口座番号フル・暗証番号・カード番号/CVV・マイナンバー・パスワード等の機微情報は、画像や文章に含まれていても絶対に抽出・出力しないでください。',
    '- 該当しないフィールドは省略してください（推測で埋めない）。',
    '- 出力は説明文なしのJSONオブジェクトのみとしてください。',
  ].join('\n');
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
