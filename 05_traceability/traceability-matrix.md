# トレーサビリティ・マトリクス

A-SPICE の中核。**上流（なぜ）から下流（実装・テスト）まで双方向にたどれる**ことを保証する。

## 1. 縦のトレース：汎用台帳 ＋ カテゴリ（Rev 1）

| STK | SYR | SWR | SWA(コンポーネント) | SWD(設計) | 実装(index.html) | テスト |
|-----|-----|-----|--------------------|-----------|------------------|--------|
| STK-01,05 | SYR-01 | SWR-CAT-01 | DataStore | ledgerModel | Category/Field 構造 | QTC-LEDGER-01 |
| STK-01,03 | SYR-03 | SWR-CAT-02,05 | PresetCatalog | ledgerModel | `PRESET_CATEGORIES`(17) | QTC-LEDGER-01, UTC-CAT-01 |
| STK-05 | SYR-04 | SWR-CAT-03,04 | SettingsView | dataIO/addCategoryFlow | `addCategoryFlow()` | QTC-CAT-01 |
| STK-01 | SYR-02 | SWR-LEDGER-01 | LedgerView | renderItemEdit | `renderLedger/renderCategoryItems` | QTC-LEDGER-01 |
| STK-01 | SYR-02 | SWR-LEDGER-02 | LedgerView | renderItemEdit | フィールド入力→persistItems | QTC-LEDGER-02 |
| STK-02 | SYR-05 | SWR-LEDGER-03 | LedgerView | renderItemEdit | 期日チップ/期日行編集 | QTC-DUE-01 |
| STK-04 | SYR-08 | SWR-LEDGER-04 | LedgerView | renderItemEdit | `#memo`処理 | 手動 |

## 2. 縦のトレース：期日ダッシュボード（Rev 1）

| STK | SYR | SWR | SWA | SWD | 実装 | テスト |
|-----|-----|-----|-----|-----|------|--------|
| STK-02 | SYR-06 | SWR-DUE-01 | DueView | renderDue | 全item走査→集約 | QTC-DUE-01 |
| STK-02 | SYR-05 | SWR-DUE-02 | DueEngine | computeNextDate | `computeNextDate()` | QTC-DUE-02, UTC-DUE-01/02/03/04 |
| STK-02 | SYR-07 | SWR-DUE-03 | DueView | renderDue | filter 1m/3m/all | QTC-DUE-03 |
| STK-02 | SYR-07 | SWR-DUE-04 | DueView | renderDue | badge overdue/soon/ok | QTC-DUE-01 |
| STK-02 | SYR-06 | SWR-DUE-05 | DueView/Router | renderDue | 行タップ→ledger遷移 | QTC-DUE-01 |

## 3. 縦のトレース：データ入出力・ガードレール（Rev 1）

| STK | SYR | SWR | SWA | SWD | 実装 | テスト |
|-----|-----|-----|-----|-----|------|--------|
| STK-08 | SYR-N2 | SWR-DATA-01 | DataStore | ledgerModel | `persist*`/localStorage | QTC-LEDGER-02 |
| STK-07 | SYR-09 | SWR-DATA-02 | SettingsView | dataIO | `exportData()`/インポート | QTC-DATA-01 |
| STK-01 | SYR-10 | SWR-DATA-03 | SettingsView | dataIO | 全消去→PRESET初期化 | 手動 |
| STK-09 | SYR-N10 | SWR-GUARD-01 | SettingsView | dataIO | 設定画面の注意書き | QTC-GUARD-01 |
| STK-08 | SYR-N4 | SWR-CORE-01 | Router | render/nav.tabs | 3タブ下部ナビ | QTC-LEDGER-01(目視) |

## 4. 縦のトレース：AI下書き入力（Rev 2）

| STK | SYR | SWR | SWA(コンポーネント) | SWD | 実装 | テスト |
|-----|-----|-----|--------------------|-----|------|--------|
| STK-06 | SYR-24 | SWR-AI-01 | AiIntake | aiIntake | Web Speech API 音声→text | 手動(実機) |
| STK-06 | SYR-24 | SWR-AI-02 | AiIntake | aiIntake | `requestExtract(extract)` | QTC-AI-01 |
| STK-06 | SYR-24 | SWR-AI-03 | AiIntake | aiIntake | 写真→`extract-image` | QTC-AI-02 |
| STK-09 | SYR-N7 | SWR-AI-04 | AiIntake | aiIntake | 画像保存せず破棄 | QTC-AI-02 |
| STK-09 | SYR-N7,N10 | SWR-AI-05 | AiIntake/RelayWorker | aiIntake/relayWorker | 注意書き＋抽出禁止プロンプト | QTC-GUARD-01, 手動 |
| STK-06 | SYR-24 | SWR-AI-06 | AiIntake | applyDraft | 下書き反映のみ(保存は人) | QTC-AI-01 |
| STK-09 | SYR-N8 | SWR-AI-07 | RelayWorker | relayWorker | `worker/index.js`(secret/CORS) | 手動(curl) |
| STK-06 | SYR-N8,N9 | SWR-AI-08 | AiIntake/SettingsView | aiIntake/dataIO | Worker URL設定・失敗時継続 | QTC-AI-03 |

## 4.5 縦のトレース：日記・俯瞰タイムライン（Rev 3）

| STK | SYR | SWR | SWA(コンポーネント) | SWD | 実装 | テスト |
|-----|-----|-----|--------------------|-----|------|--------|
| STK-10 | SYR-25 | SWR-JOURNAL-01 | JournalView | journal | `renderJournal()` push | QTC-JOURNAL-01 |
| STK-10 | SYR-25 | SWR-JOURNAL-02 | JournalView | journal | 気分/本文/タグ/音声/カテゴリ | QTC-JOURNAL-01 |
| STK-10 | SYR-25 | SWR-JOURNAL-03 | JournalView | journal | `renderJournalEdit()` 編集/削除 | QTC-JOURNAL-02 |
| STK-10 | SYR-26 | SWR-TL-01 | JournalView | timeline | `buildTimeline()` 混在描画 | QTC-TL-01, UTC-TL-01 |
| STK-10 | SYR-26,27 | SWR-TL-02 | JournalView | timeline | 期間フィルタ ±7/±31/∞ | QTC-TL-01 |
| STK-10 | SYR-27 | SWR-TL-03 | JournalView | timeline | タグ絞り込み（期日を隠す） | QTC-TL-02 |
| STK-07 | SYR-09 | SWR-DATA-02 | SettingsView | dataIO | export/import に journal | QTC-DATA-02 |
| STK-08 | SYR-N2 | SWR-DATA-04 | DataStore | ledgerModel | journal 後方互換補完 | UTC-JRN-01 |

## 5. 横断（非機能）

| SYR | SWR | 実装 | テスト |
|-----|-----|------|--------|
| SYR-N1,N3 | （アーキ制約） | 単一HTML・サーバ不要・ライブラリ非依存 | アーキ審査 |
| SYR-N2 | SWR-DATA-01 | localStorage 3キー・画像は保存しない | QTC-AI-02 |
| 品質 | — | コンソールエラー無し | QTC-NO-ERRORS |

## 6. カバレッジ・サマリー
- STK 10件中、Rev 1–3 で **STK-01〜06, STK-08, STK-09, STK-10** をカバー。STK-07（家族同期）は Rev 4 で対応予定（当面 JSON 受け渡し=SWR-DATA-02 で部分達成）。
- 全 SWR-CAT/LEDGER/DUE/DATA/AI/GUARD/JOURNAL/TL-* が **実装＋テストに到達**（孤立要求なし）。
  ただし SWR-AI-01・SWR-JOURNAL-02の音声（実機マイク）／SWR-AI-07（Worker実疎通）は外部・実機依存のため手動確認。
- 孤立コード（要求に紐づかない実装）＝なし。

> 更新ルール：要求 or 実装を変えたら、必ずこの表の該当行を更新してから merge する（一貫性維持）。
