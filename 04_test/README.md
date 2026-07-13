# テスト（SWE.4 / SWE.6）

A-SPICE の検証プロセスに対応するテスト置き場。

```
04_test/
├── qualification/   # SWE.6 適格性確認テスト（実ブラウザE2E）
│   └── secretary-features.mjs
└── unit/            # SWE.4 単体テスト（純ロジック, 今後追加）
```

## 適格性テストの実行

Chromium と Playwright が必要。この開発環境では Chromium が
`/opt/pw-browsers` にプリインストールされている。

```bash
# 1. playwright-core を用意（初回のみ）
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm i -D playwright-core

# 2. 実行（Chromiumのパスは環境変数で上書き可）
export CHROMIUM_BIN=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
node 04_test/qualification/secretary-features.mjs
```

成功すると各 `QTC-*` / `UTC-*` の結果と `✅ 全N件 Pass` が出力され、終了コード 0。
失敗時は終了コード 1（CI で検知可能）。

## 対応表
| テスト | 検証対象 | 仕様 |
|--------|----------|------|
| secretary-features.mjs | 台帳・カテゴリ追加・期日エンジン・JSON出力・AI下書き（Worker応答はモック）・回帰 | `02_software/SWE.5-6-integration-qualification-test.md` |

## TODO
- `unit/` に `computeNextDate` 等の純関数テストを追加（DOM非依存）。
- GitHub Actions で push 時に自動実行（`06_management/SUP.8-9-10-*` 参照）。
