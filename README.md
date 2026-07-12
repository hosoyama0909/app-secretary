# template-vanilla-webapp

新しいアプリを作るための **最小スターター**（バニラ HTML / CSS / JS・単一ファイル・サーバ不要）。
GitHub の **Template repository** に指定して、ここから新アプリを複製します。

## 中身

- `index.html` … これ1つで動くスターター。`localStorage` 保存の実演つき。

## 使い方（新アプリの作り方）

1. GitHub でこのリポジトリの **「Use this template」** から新リポジトリを作成
   （名前は小文字ケバブケース＋プレフィックス。例：`app-baseball`）。
2. `index.html` の中身を書き換えて、作りたいアプリにする。
3. `localStorage` のキー（`template-vanilla-webapp:name` の部分）を、
   新アプリ名に合わせて一意な文字列に変える（他アプリと衝突しないように）。
4. main に push すると GitHub Pages で公開される。
5. 公開できたら、ハブ（`hosoyama0909.github.io`）の `index.html` にカードを1枚足してリンク。

## 方針（このプロジェクト共通）

- **デザインはシンプル志向**。家族（小さい子ども）も使うので、タップ領域は大きめ・導線は分かりやすく。
- **個人の実データ・秘密情報はコードにもリポジトリにも置かない**。
  端末内の `localStorage`（またはパスワード管理アプリ）に保存する。
