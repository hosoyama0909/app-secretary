# CLAUDE.md — 秘書アプリ 開発ガイド

新しいセッションはこのファイルを最初に読む。ここに**このリポジトリの開発の流儀**をまとめる。
オーナーの背景・構想・機微情報ルールは、非公開リポジトリ `hosoyama0909/docs-private` の
`CLAUDE.md` と `30_Projects/アプリ開発/秘書アプリ構想.md` を参照（Public なこのリポには個人情報を書かない）。

---

## このリポジトリは何か

- 「秘書アプリ」。家庭の庶務を **台帳＋期日リマインド＋相談窓口** として一元管理するWebアプリ。
- 実装は **単一 HTML**：`03_implementation/index.html`（外部ライブラリ非依存・localStorage 保存・ログイン不要）。
- **カテゴリ定義をデータとして持つ汎用台帳モデル**が核。新しい庶務ドメインは
  設定画面から「カテゴリを追加」するだけで増やせる（コード変更不要）。
- AI下書き入力（音声/会話テキスト/写真OCR）は **Cloudflare Worker 経由で Gemini** を呼ぶ：
  `03_implementation/worker/`。AIは**下書きを作るだけ**で、保存前に人が確認する（human-in-the-loop）。

---

## 開発プロセス（A-SPICE テーラリング版）

学習も兼ねて **Automotive SPICE の V字モデル**に沿う。全体像は
`00_process/aspice-overview-and-tailoring.md`。運用は `app-familybook` と同じ流儀。

### リポジトリ構成（V字の流れ順に採番）
```
00_process/        プロセス定義・テーラリング・用語
01_system/         SYS.1 要求 → SYS.2 分析 → SYS.3 アーキ
02_software/       SWE.1 要求 → .2 アーキ → .3 詳細設計 → .4/.5-6 検証仕様
03_implementation/ index.html（本体）＋ worker/（Cloudflare Worker）
04_test/           SWE.6 適格性テスト（Playwright）
05_traceability/   トレーサビリティ・マトリクス（中核）
06_management/     MAN.3/5・SUP.8/9/10
index.html         直下＝本体への転送ページ（?v=時刻でキャッシュ回避）
```

### 1機能を追加する流れ（毎回これで回す）
1. **CR 起票**（GitHub Issue, `change-request` ラベル）＝何を・なぜ
2. `01_system`/`02_software` の要求に **ID 採番**（SYR-/SWR-）
3. アーキ・詳細設計に反映（`02_software/SWE.2`・`SWE.3`）
4. `03_implementation/index.html` を実装（コミットに要求ID/CR番号を書く）
5. `04_test/` で検証（下記コマンド）
6. **`05_traceability` を更新** → PR → セルフレビュー → マージ → CR クローズ
7. リリース時は `CHANGELOG.md` 追記（＋必要ならタグ）

完了条件（DoD）は `06_management/MAN.3-project-management.md`。

---

## テスト

適格性テストは Playwright（headless Chromium）。この開発環境なら：
```bash
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm i -D playwright-core            # 初回のみ
export CHROMIUM_BIN=/opt/pw-browsers/chromium-1194/chrome-linux/chrome  # 環境依存・要確認
node 04_test/qualification/secretary-features.mjs
```
- 変更を入れたら **関連スイート＋回帰**を通す（`04_test/qualification/*.mjs`）。
- Worker/Gemini の実呼び出しは外部依存のため **テストではモック**する。

---

## 配信（GitHub Pages）

- **ブランチ配信（Deploy from a branch / root）**。`main` にマージすれば自動反映。
- 直下 `index.html` が本体 `03_implementation/index.html` へ `?v=時刻` 付きで転送
  → 更新後に古い画面がキャッシュで残らない。
- 公開URL：**https://hosoyama0909.github.io/app-secretary/**
- ⚠️ 新規リポは Pages が既定オフ。初回のみ Settings → Pages → Deploy from a branch →
  `main` / `/ (root)` を設定する必要がある。

---

## Git 運用

- 開発ブランチ：`claude/<topic>`。**機能ごとに main から作り直す**（同名でOK）。
- コミットメッセージに要求ID/CR番号を含める。
- PR はセルフレビュー（＋必要時 AI レビュー）。マージで公開反映。

---

## オーナーの前提（詳細は docs-private/CLAUDE.md）

- プロのソフトウェアエンジニア。**説明は簡潔でよい**が、**設計判断の理由**は一言添える。
- **デザインはシンプル志向**。家族（小さな子ども）も使うので**大きめのタップ領域・分かりやすい導線**。
- 実データ（氏名・住所等）はコードに書かない。localStorage に保存。
- 🔴機微情報（口座番号フル・暗証番号・カード番号・マイナンバー・パスワード）はアプリにも入力しない。

---

## 現在地（2026-07 時点）

- Rev 1（汎用台帳・17ドメイン・期日ダッシュボード・JSON入出力）実装済み。
- Rev 2（AI下書き入力：音声/会話/写真OCR ＋ 中継Worker v2）実装済み。
- 次は Rev 3（家族間同期）。実需が出てから着手（当面は JSON エクスポート/インポートで共有）。
