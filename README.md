# app-secretary（秘書アプリ）

家庭の庶務（家計・家電・住宅・車・教育費・消耗品ほか）を、**台帳＋期日リマインド＋相談窓口**として
一元管理するアプリ。実装はバニラ HTML/CSS/JS の単一ファイル・サーバ不要・ログイン不要。

- 実装：`03_implementation/index.html`（＋ AI下書き用 `03_implementation/worker/`）
- 構想・意思決定：`docs-private` の `30_Projects/アプリ開発/秘書アプリ構想.md`
- 公開URL（GitHub Pages）：https://hosoyama0909.github.io/app-secretary/ （下記「配信」参照）

## 開発プロセス（A-SPICE テーラリング版）

学習も兼ねて、開発を **Automotive SPICE の V字モデル** に沿って進める（既存の `app-familybook` と同じ流儀）。
まず全体像は **[00_process/aspice-overview-and-tailoring.md](00_process/aspice-overview-and-tailoring.md)** を参照。

### リポジトリ構成（V字の流れ順に採番）

```
.
├── 00_process/          # プロセス定義・テーラリング・用語
├── 01_system/           # SYS.1 要求 → SYS.2 分析 → SYS.3 アーキ
├── 02_software/         # SWE.1 要求 → .2 アーキ → .3 詳細設計 → .4/.5/.6 検証仕様
├── 03_implementation/   # index.html（実装＝SWE.3のユニット構築成果物・配信対象）＋ worker/
├── 04_test/             # SWE.6 適格性テスト(qualification) / SWE.4 単体(unit)
├── 05_traceability/     # トレーサビリティ・マトリクス（中核）
├── 06_management/       # MAN.3/5, SUP.8/9/10
├── index.html           # 直下＝本体への転送ページ（?v=時刻でキャッシュ回避）
├── CLAUDE.md / README.md / CHANGELOG.md
```

番号は **V字モデルの読み順**（要求→設計→実装→検証→トレース→管理）に対応している。
左右（要求⇔テスト）は **[05_traceability/traceability-matrix.md](05_traceability/traceability-matrix.md)** で相互リンクする。

## アプリの機能（4画面）

- 📔 **日記**（既定の入口）：日々の出来事を気分・タグ・関連カテゴリつきで記録。
  日記と「その日にかかる期日」を1つの**俯瞰タイムライン**に混ぜて表示（上=これから／下=これまで）。
  期間（今週/今月/すべて）とタグで絞り込み。音声でも書ける。
- 🔔 **期日**：全カテゴリ横断で、近い期日から一覧（今月/3ヶ月/すべて絞り込み・まもなく/期限切れ色分け）
- 🗂️ **台帳**：カテゴリ → 記録一覧 → 記録の編集（フィールド・期日・メモ）
- ⚙️ **設定**：カテゴリの追加、AI下書き用 Worker URL、JSONエクスポート/インポート、全消去

### 拡張しやすい構成（設計の核）
カテゴリ（ドメイン）はフィールド定義を**データとして**持つ。新しい庶務ドメインを増やすときは、
設定画面から「カテゴリを追加」するだけでよく、コード変更は不要（`SWR-CAT-04`）。
初期プリセットは17ドメイン（家計・資産／家電／住宅／車／教育費／消耗品／保険／契約・サブスク／
税金／証明書・書類／健康・医療／学校・保育園／季節タスク／防災備蓄／冠婚葬祭・贈答／
ポイント・クーポン／実家・親族）。

### AI下書き入力（Rev 2）
記録の編集画面に「✨ 楽な入力」パネルがある。🎤音声（Web Speech API）／📝会話テキスト／📷写真OCR から
下書きを作り、フォームに反映する。いずれも **AIは下書きを作るだけ**で、保存前に必ず人が確認する。
Worker を使うには `03_implementation/worker/README.md` の手順でデプロイし、⚙️設定に URL を登録する。
画像は保存せず抽出後に破棄。🔴機微情報は抽出させず・アプリにも入力しない。

## 新機能を追加する手順（1機能＝ミニV字）
1. Issue で変更依頼（CR）を起票
2. `01_system` `02_software` の要求に ID を採番して追記
3. アーキ・詳細設計に反映（SWE.2 / SWE.3）
4. `03_implementation/index.html` を実装（コミットに要求ID/CR番号）
5. `04_test/` で検証（`node 04_test/qualification/secretary-features.mjs`）
6. トレーサビリティ・マトリクスを更新 → レビュー → merge → タグ

詳細な完了条件は [MAN.3 の Definition of Done](06_management/MAN.3-project-management.md) を参照。

## 配信（GitHub Pages）

**ブランチ配信（Deploy from a branch / root）** を使う。

- **設定**：Settings → Pages → Build and deployment → Source =「Deploy from a branch」
  → Branch: `main` / Folder: `/ (root)` → Save
  （⚠️ 新規リポは既定オフ。初回のみこの設定が必要）
- **入口**：リポジトリ直下の `index.html` が本体 `03_implementation/index.html` へ転送する。
  そのため **https://hosoyama0909.github.io/app-secretary/** でこのアプリが開く。
  転送時に `?v=時刻` を自動付与するため、更新後に古い画面がキャッシュで残らない。
- **本体URL（直接）**：`https://hosoyama0909.github.io/app-secretary/03_implementation/index.html`

> 更新は `main` への push/マージだけで自動反映（数十秒〜数分）。

## 方針（このプロジェクト共通）

- **実データは端末内 `localStorage` のみ**。コード・リポジトリには一切置かない。
- AI下書きのためにテキスト/画像を外部AI（Gemini）へ送信することがある（Worker URL 登録時のみ）。
  🔴機微情報（口座番号フル・暗証番号・カード番号・マイナンバー・パスワード）は扱わない。
- デザインはシンプル志向。家族（小さい子ども）も使うため、タップ領域は大きめ・導線は分かりやすく。
- 家族間の共有は当面 JSON エクスポート/インポート。将来的に Cloudflare Worker + KV/D1 同期を検討（Rev 3）。
