# SWE.2 ソフトウェアアーキテクチャ設計

`03_implementation/index.html` 内の IIFE（`(function(){ ... })()`）を、論理コンポーネントに分解する。
全コンポーネントは単一状態（`categories` / `items` / `settings`）を共有し、変更後に
`persistCategories()` / `persistItems()` / `persistSettings()` で永続化する。

## コンポーネント図

```
                ┌──────────────┐
                │   Router     │ state.screen + render()
                │  (nav.tabs)  │ due / ledger / settings
                └──────┬───────┘
                       │
   ┌───────────────────┼───────────────────────────┐
   │                   │                            │
┌──▼─────────┐  ┌──────▼────────┐  ┌────────────────▼───┐
│ DueView     │  │  LedgerView    │  │ SettingsView        │
│ renderDue   │  │ renderLedger/  │  │ renderSettings      │
│ 期日集約    │  │ CategoryItems/ │  │ カテゴリ管理/入出力 │
│ 色分け      │  │ ItemEdit       │  │                     │
└──┬─────────┘  └──────┬────────┘  └─────────┬──────────┘
   │                   │                     │
   │            ┌──────▼────────┐            │
   │            │  AiIntake      │ renderAiPanel/applyDraft/requestExtract
   │            └──────┬────────┘            │
   │                   │                     │
   └────────┬──────────┴──────────┬──────────┘
            │                     │
     ┌──────▼──────┐       ┌──────▼─────────┐
     │  DueEngine   │       │  DataStore      │
     │computeNextDate│      │ categories/items│
     │daysBetween    │      │ /settings +     │
     │toISO/parseISO │      │ persist*/load*  │
     └──────────────┘       └──────┬─────────┘
                                   │
                            ┌──────▼────────┐   ┌──────────────────┐
                            │ localStorage   │   │ RelayWorker(別)   │
                            │ 3キー          │   │ worker/index.js   │
                            └───────────────┘   │ テキスト/画像抽出 │
                                                 └──────────────────┘
```

## コンポーネント定義とインタフェース

| コンポーネント | 責務 | 主なI/F | 割当 SWR |
|----------------|------|---------|----------|
| DataStore | 状態保持・永続化・共通ユーティリティ | `categories`,`items`,`settings`, `loadJSON/saveJSON`, `persistCategories/Items/Settings`, `uid()`, `getCategory(id)` | SWR-DATA-01, SWR-CAT-01 |
| PresetCatalog | プリセット17ドメインの定義 | `PRESET_CATEGORIES` | SWR-CAT-02,05 |
| DueEngine | 期日の次回日算出・日数計算 | `computeNextDate(entry,today)`, `daysBetween`, `toISO/parseISO/startOfToday/pad2` | SWR-DUE-02 |
| Router | 3タブ切替と再描画 | `state.screen`, `render()`, `setActiveTab()`, `el()` | SWR-CORE-01 |
| DueView | 期日の横断集約・絞り込み・色分け | `renderDue()`, `itemTitle()` | SWR-DUE-01,03,04,05 |
| LedgerView | カテゴリ一覧・記録一覧・記録編集 | `renderLedger()`, `renderCategoryItems()`, `renderItemEdit()` | SWR-LEDGER-01〜04 |
| AiIntake | 音声/テキスト/画像からの下書き生成・反映 | `renderAiPanel(cat,item)`, `applyDraft()`, `requestExtract(payload)` | SWR-AI-01〜06,08 |
| SettingsView | カテゴリ管理・Worker URL・JSON入出力・全消去・注意書き | `renderSettings()`, `addCategoryFlow()`, `exportData()` | SWR-CAT-03, SWR-DATA-02,03, SWR-AI-08, SWR-GUARD-01 |
| RelayWorker（別デプロイ） | キー秘匿・Gemini代理（テキスト/画像） | `03_implementation/worker/index.js` | SWR-AI-07 / SYR-N8 |

## 静的・動的側面
- **静的**：全コンポーネントは DataStore の `categories/items/settings` に依存（単方向）。
  UI層はクラス/id（`nav.tabs`, `.cat-tile`, `.list-item`, `#f-<key>` 等）で結合。
  横断機能（DueView・入出力）は**カテゴリ非依存**に実装（SWR-CAT-04）。
- **動的（AI下書きシーケンス）**：
  1. ユーザが音声/テキスト/写真を入力 → AiIntake が payload（フィールド定義＋テキスト or 画像）を組む
  2. `requestExtract()` が settings.workerUrl へ POST（未設定なら導線表示で終了＝SWR-AI-08）
  3. Worker が Gemini を代理呼び出し → フィールド値JSONを返す
  4. `applyDraft()` がフォーム値に反映（**保存は人が確認して行う**＝SWR-AI-06）。画像は破棄（SWR-AI-04）

詳細は `SWE.3-detailed-design.md` へ。
