# SWE.5 結合テスト / SWE.6 適格性確認テスト

単一実行体のため SYS.4/SYS.5 をここに統合（テーラリング）。
コンポーネント結合（DataStore⇄DueEngine⇄DueView / LedgerView⇄AiIntake⇄RelayWorker）と、
利用者視点の適格性を **実ブラウザ（Playwright/Chromium）E2E** で確認する。

## テスト対象・環境
- 対象：`03_implementation/index.html`
- 実行：`04_test/qualification/secretary-features.mjs`（Chromium headless, viewport 390×844）
- 実行方法：`04_test/README.md` を参照。
- AI（Worker/Gemini）は外部依存のため、**Worker応答をモック**（`window.fetch` 差し替え）して統合を検証。

## 適格性テストケース

| ID | シナリオ | 期待結果 | 割当(SWR/SYR) | 結果 |
|----|----------|----------|---------------|------|
| QTC-LEDGER-01 | 起動→台帳タブ表示 | プリセット17カテゴリのタイルが表示される | SWR-CAT-02,05, SWR-LEDGER-01 | ✅ Pass |
| QTC-LEDGER-02 | 家電で新規記録→メーカー/価格入力 | item が作成され values に保存・reload保持 | SWR-LEDGER-02, SWR-DATA-01 | ✅ Pass |
| QTC-DUE-01 | 記録に期日を付与→期日タブ表示 | ダッシュボードに1件以上が近い順で並ぶ | SWR-DUE-01 | ✅ Pass |
| QTC-DUE-02 | computeNextDate（yearly/interval）をブラウザ内評価 | yearlyは翌年へ繰上、intervalはNヶ月刻みで今日以降 | SWR-DUE-02 (UTC-DUE-02,03) | ✅ Pass |
| QTC-DUE-03 | 絞り込みを「すべて」へ切替 | 期間外の将来期日も一覧に出る | SWR-DUE-03 | ✅ Pass |
| QTC-CAT-01 | 設定→カテゴリ追加（promptスタブ） | カテゴリが18件になり台帳に出る | SWR-CAT-03,04 | ✅ Pass |
| QTC-DATA-01 | 設定→JSONエクスポート | ダウンロードイベントが発火する | SWR-DATA-02 | ✅ Pass |
| QTC-AI-01 | Worker URL設定＋fetchモック→下書き作成 | 返却JSONが values/dates に反映される | SWR-AI-02,06 | ✅ Pass |
| QTC-AI-02 | 写真から下書き（画像fetchモック） | 反映後、localStorage に画像base64が残らない | SWR-AI-04 / SYR-N7 | ✅ Pass |
| QTC-AI-03 | Worker応答を502失敗にする | クラッシュせず台帳・期日は動作継続、エラー表示のみ | SWR-AI-08 / SYR-N9 | ✅ Pass |
| QTC-GUARD-01 | 設定タブ表示 | 🔴機微情報の注意書きが表示される | SWR-GUARD-01 / SYR-N10 | ✅ Pass |
| QTC-NO-ERRORS | 全操作中のコンソール/ページエラー | エラーが発生しない | 品質 | ✅ Pass |

## 実行記録
Rev 1 + Rev 2（2026-07-13）
```
QTC-LEDGER-01 tiles=17 / QTC-LEDGER-02 values{maker,price} reload保持 /
QTC-DUE-01 rows≥1 / QTC-DUE-02 yearly→翌年, interval 2026-01→2027-01 /
QTC-CAT-01 categories=18 / QTC-DATA-01 download=true /
QTC-AI-01 draft反映 / QTC-AI-02 画像localStorage無し / QTC-AI-03 502でも継続 /
QTC-GUARD-01 注意書き表示 / QTC-NO-ERRORS errors=0
→ 全件 Pass。コンソールエラー無し。
```

## トレーサビリティ
全 QTC / UTC は `05_traceability/traceability-matrix.md` で SWR/SYR/STK まで遡れる。

## 未カバー（次リリースで追加）
- Worker↔Gemini の実データ疎通（外部依存）。デプロイ後に `03_implementation/worker/README.md` の curl で手動確認。
- 音声入力（Web Speech API）は実機・実マイク依存のため、E2E ではボタン活性のみ確認し発話は手動確認。
- 家族間同期（Rev 3）は未実装。
