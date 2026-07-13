# app-secretary-relay（Gemini中継 Worker）

秘書アプリの「音声/会話テキスト/写真」からの下書き入力を支えるための、
最小の Cloudflare Worker。APIキーはこの Worker のみが保持し、アプリ本体
（`index.html`）やリポジトリには一切置かない。

## デプロイ

```sh
cd worker
npx wrangler login
npx wrangler secret put GEMINI_API_KEY   # Gemini APIキーを登録
npx wrangler deploy
```

デプロイ後に発行される `https://xxxx.workers.dev` を、アプリの
設定画面（⚙️設定 → AI下書き）に入力する。

## エンドポイント仕様

`POST /`

```jsonc
// テキストから抽出
{ "mode": "extract", "fields": [{"key":"maker","label":"メーカー","type":"text"}], "text": "冷蔵庫、パナソニックの…" }

// 画像から抽出（写真は保存せず、この場で読み取るだけ）
{ "mode": "extract-image", "fields": [...], "imageBase64": "...", "mimeType": "image/jpeg" }
```

レスポンスは、フィールドの key をキーとしたJSONオブジェクト
（+ 任意で `dates` 配列, `memo` 文字列）。

## 方針

- 画像はこの Worker を素通りするだけで、どこにも保存しない。
- 🔴機微情報（口座番号フル・暗証番号・カード番号・マイナンバー・パスワード）は
  プロンプトで明示的に抽出させない。
