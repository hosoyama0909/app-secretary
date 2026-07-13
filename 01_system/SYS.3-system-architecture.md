# SYS.3 システムアーキテクチャ設計

## 全体構成

```
┌──────────────────────────────────────────────┐
│           ブラウザ (単一実行体)                 │
│  index.html = HTML(UI) + CSS(テーマ) + JS(app) │
│                                                │
│   ┌───────────┐   ┌────────────────────────┐  │
│   │  UI 層     │   │   アプリケーション層    │  │
│   │ 期日/台帳/ │←→│  状態(categories/items) │  │
│   │ 設定タブ   │   │  + レンダリング         │  │
│   └───────────┘   └───────────┬────────────┘  │
│                                │                │
│                    ┌───────────▼───────────┐    │
│                    │  永続化層 localStorage  │    │
│                    │  keys: categories/     │    │
│                    │        items/settings  │    │
│                    └────────────────────────┘    │
└───────────────┬──────────────────┬──────────────┘
                │                  │
      Web Speech API        中継Worker(Cloudflare)
      （音声→テキスト）      （AI下書き・任意）→ Gemini
```

## システム要素と割り当て

| 要素 | 責務 | 割り当てる SYR |
|------|------|----------------|
| UI 層（期日 / 台帳 / 設定タブ） | 画面遷移・入力・表示 | SYR-01〜10 |
| アプリ状態 `categories[]` / `items[]` / `settings` | 全データの単一ソース | 全機能 |
| 永続化（localStorage） | 端末内保存（3キー） | SYR-N2 |
| 期日エンジン | 単発/毎年/interval の次回日算出 | SYR-05,06,07 |
| Web Speech 連携 | 音声→テキスト（端末側・任意） | SYR-24 |
| AI中継 Worker（別デプロイ） | キー秘匿・Gemini代理（テキスト/画像） | SYR-24, N7, N8 |

## 主要なアーキ決定（ADR 要約）

| 決定 | 根拠 | 対応 |
|------|------|------|
| サーバを持たずクライアント完結 | ログイン不要・無料・プライバシー（SYR-N1,N2） | 配信は静的 |
| **カテゴリ定義をデータ（localStorage）として持つ汎用台帳モデル** | **新ドメインを画面操作だけで追加＝コード変更不要（SYR-04）。17→∞に拡張可** | LedgerModel |
| 期日は「単発/毎年/nヶ月ごと」の3モードに正規化して横断計算 | 車検・保証・納税・消費期限を1つのダッシュボードで扱う（SYR-06） | DueEngine |
| 実データは端末内 localStorage のみ・画像は保存しない | 機微情報の露出を避ける（SYR-N2, N7, STK-09） | DataStore |
| **AI下書きは中継Worker経由でGeminiを呼ぶ（Rev 2）** | **APIキーをクライアントに出さない（SYR-N8）／家族配布に対応** | worker/ + AiIntake |
| AIは下書きのみ・保存前に人が確認 | 家庭の台帳は誤読が困る（human-in-the-loop, RSK-06） | AiIntake |

## AI連携アーキ（Rev 2 で追加）

```
[ブラウザ]  ──① フィールド定義＋テキスト or 画像(base64) POST──▶ [Cloudflare Worker]
 （キーは持たない）                                              │ GEMINI_API_KEY を secret 保持
                                                                │ ② 抽出プロンプト整形（機微情報は抽出させない）
                        ◀───④ フィールド値JSON(+CORS)────────── │ ③ Gemini generateContent 呼び出し
                                                                ▼
                                                         [Google Gemini API]
```
- 送信データ：カテゴリのフィールド定義（型つき）＋会話テキスト、または保証書等の画像（base64）。
- **画像は Worker を素通りするだけで保存しない**（SYR-N7）。抽出結果は下書きとしてフォームに反映し、
  人が確認して localStorage に保存。Worker URL 未設定・失敗時は台帳・期日は通常動作（SYR-N9）。

## データモデル（システムレベル）

```
localStorage
├─ app-secretary:categories = Category[]
│    Category { id, name, icon, order, dateHints[], fields:[{key,label,type,unit?,options?}] }
├─ app-secretary:items = Item[]
│    Item { id, categoryId, values:{[key]:value}, dates:[DateEntry], memo, createdAt }
│    DateEntry { label, mode:'once'|'yearly'|'interval', date, intervalMonths, leadDays }
└─ app-secretary:settings = { workerUrl }
```

ソフトウェア内部の分解は `02_software/SWE.2-software-architecture.md` へ続く。
