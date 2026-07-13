# A-SPICE 適用方針とテーラリング

このリポジトリは、秘書アプリ（家庭の庶務台帳）の開発を **Automotive SPICE（A-SPICE）** の
プロセス参照モデルに沿って進めるための構成です。学習を目的としているため、
本来は自動車の安全系ソフト向けである A-SPICE を、個人開発のWebアプリに合わせて
**テーラリング（適合）** しています。運用の流儀は既存の `app-familybook` に揃えています
（今後のアプリはこの雛形で開発する方針）。

## A-SPICE とは（超要約）

- **プロセス参照モデル（PRM）＋アセスメントモデル（PAM）**。VDA（ドイツ自動車工業会）が
  評価対象を絞った "VDA scope" を定義している。
- 中心は **V字モデル**：左側で「要求→アーキ→設計」と分解し、右側で「単体→結合→適格性」と
  検証していく。左右の各段が対になっている。
- 評価軸は **能力レベル 0〜5**（0:不完全 〜 5:革新）。各レベルは
  プロセス属性（PA）で測る。学習段階では **レベル1（実施している）→ レベル2（管理している）** を目標にする。

### 主要プロセス（VDA scope, v3.1 準拠。v4.0 では一部改称）

| ID | プロセス | このリポジトリでの成果物 |
|----|----------|--------------------------|
| SYS.1 | 要求抽出 | `01_system/SYS.1-stakeholder-requirements.md` |
| SYS.2 | システム要求分析 | `01_system/SYS.2-system-requirements.md` |
| SYS.3 | システムアーキ設計 | `01_system/SYS.3-system-architecture.md` |
| SYS.5 | システム適格性確認テスト | `02_software/SWE.5-6-integration-qualification-test.md`（統合） |
| SWE.1 | ソフトウェア要求分析 | `02_software/SWE.1-software-requirements.md` |
| SWE.2 | ソフトウェアアーキ設計 | `02_software/SWE.2-software-architecture.md` |
| SWE.3 | 詳細設計・実装 | `02_software/SWE.3-detailed-design.md` ＋ `03_implementation/index.html` |
| SWE.4 | ソフトウェア単体検証 | `02_software/SWE.4-unit-verification.md` |
| SWE.5 | 結合・結合テスト | `02_software/SWE.5-6-integration-qualification-test.md` |
| SWE.6 | ソフトウェア適格性確認テスト | 同上 ＋ `04_test/` |
| SUP.8 | 構成管理 | `06_management/SUP.8-9-10-supporting-processes.md`（＝Git運用） |
| SUP.9 | 問題解決管理 | 同上（＝Issue/バグ管理） |
| SUP.10 | 変更依頼管理 | 同上（＝Change Request/PR） |
| MAN.3 | プロジェクト管理 | `06_management/MAN.3-project-management.md` |
| MAN.5 | リスク管理 | `06_management/MAN.5-risk-management.md` |

## テーラリング（何を残し、何を省いたか）

学習目的・個人開発・非安全という前提で、以下のように適合した。

### 残す（骨格）
- **双方向トレーサビリティ**：STK → SYR → SWR → SWA → SWD → 実装 → テスト を
  ID で相互リンク（`05_traceability/traceability-matrix.md`）。A-SPICE の肝。
- **V字の各段の成果物**：要求・アーキ・設計・検証を文書化。
- **構成管理（SUP.8）**：Git のブランチ運用・タグ・コミット規約で代替。
- **問題管理・変更管理（SUP.9/10）**：GitHub Issue / PR で運用。

### 省く・簡略化する（正式にテーラリングとして記録）
| プロセス | 判断 | 理由 |
|----------|------|------|
| ACQ.* / SPL.* | 除外 | 発注者・供給者関係が無い（一人開発） |
| SYS.4 システム統合 | SW結合に統合 | 単一実行体（HW/複数ECU無し） |
| SUP.1 品質保証（独立監査） | セルフレビューで代替 | 独立したQA組織が無い |
| 能力レベル判定 | 概念のみ | 学習段階。まずはPA1.1達成を目指す |
| MLE（機械学習, v4.0） | 対象外 | AIは外部API（Gemini）を利用するのみで、モデル開発はしない |

> テーラリングは「手を抜く」ことではなく、**なぜ省くかを根拠付きで記録する** ことが A-SPICE 的に重要。

## 開発サイクル（このリポジトリでの回し方）

1. **変更依頼（CR）を起票**（GitHub Issue）— 何を・なぜ。
2. **影響する要求を更新**（SYS.2 / SWE.1）— ID を採番。
3. **アーキ・設計に反映**（SWE.2 / SWE.3）。
4. **実装**（`03_implementation/index.html`）— コミットに要求ID・CR番号を書く。
5. **検証**（SWE.4 単体 / SWE.6 適格性 — `04_test/`）。
6. **トレーサビリティ更新**（matrix）＋ **レビュー** して merge。

各リリース（Rev 1, Rev 2…）を、この 1〜6 のミニ V字で回す。

## バージョン
- 準拠元：Automotive SPICE PAM v3.1（VDA scope）を基準にテーラリング。
- 最終更新：2026-07-13
