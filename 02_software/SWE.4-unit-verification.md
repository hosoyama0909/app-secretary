# SWE.4 ソフトウェア単体検証

各ユニット（SWD-*）の検証。純ロジックである **期日エンジン（computeNextDate）** は
`window.__secretaryApp.computeNextDate` を通じて自動ユニット検証する。DOM 依存のユニットは
E2E（SWE.6）で検証する。現段階は PA1.1（実施）を満たす。

## 単体テストケース

| ID | 対象ユニット | 入力/条件 | 期待結果 | 割当 | 状態 |
|----|--------------|-----------|----------|------|------|
| UTC-DUE-01 | computeNextDate | mode='once', date=D | D をそのまま返す | SWR-DUE-02 | ✅ 自動(secretary-features.mjs) |
| UTC-DUE-02 | computeNextDate | mode='yearly', 基準の月日が今日より過去 | 翌年の同月日を返す（過去に残さない） | SWR-DUE-02 | ✅ 自動 |
| UTC-DUE-03 | computeNextDate | mode='interval', date=2026-01-01, N=6, today=2026-08-01 | 2027-01-01（基準からNヶ月刻みで今日以降の最初） | SWR-DUE-02 | ✅ 自動 |
| UTC-DUE-04 | computeNextDate | date 未設定 | null（期日として扱わない） | SWR-DUE-02 | ✅ 設計上保証 |
| UTC-CAT-01 | 起動時初期化 | localStorage 空で起動 | categories が17件になる | SWR-CAT-02 | ✅ E2E(QTC-LEDGER-01) |
| UTC-JRN-01 | journal 後方互換 | journal 無しの旧データ読込 | journal=[] に補完しエラー無し | SWR-DATA-04 | ✅ 設計上保証 |
| UTC-TL-01 | buildTimeline | 日記＋期日が範囲内 | day-group 降順で両kindを含む | SWR-TL-01 | ✅ E2E(QTC-TL-01) |

## レビュー観点（コードレビューチェックリスト）
- [x] 期日算出が単発/毎年/nヶ月ごとで正しく、過去日を今日以降へ繰り上げるか（SWR-DUE-02）
- [x] 横断機能（期日・入出力）がカテゴリ非依存で、追加カテゴリも自動対象になるか（SWR-CAT-04）
- [x] AI下書きで画像 base64 を state/localStorage に残していないか（SWR-AI-04）
- [x] AI抽出プロンプトで🔴機微情報を抽出させない指示があるか（SWR-AI-05）
- [x] 入力の都度 persist で保存忘れが起きないか（SWR-LEDGER-02）

## TODO（能力レベル向上）
- [ ] `04_test/unit/` に computeNextDate 等の純関数テストを Node 単体（DOM非依存）で分離
- [ ] CI（GitHub Actions）で push 時に自動実行

> 現状 computeNextDate は `window.__secretaryApp` 経由でブラウザ内評価して検証している。
> 純ロジックを別モジュールへ抽出できれば、ここで Node 単体自動化できる（リファクタ候補・RSK-07）。
