# SWE.3 詳細設計・ユニット構築

実装は `03_implementation/index.html` の `<script>` 内。ここでは主要ユニットのアルゴリズムを、
実装と対応付けて記述する（コード自体が構築成果物）。

## SWD-computeNextDate（DueEngine）
割当：SWR-DUE-02

```
computeNextDate(entry, today=startOfToday()):
  if !entry.date: return null
  base ← parseISO(entry.date)
  if mode='once'     : return base
  if mode='yearly'   : next ← (今年, base.月, base.日)
                       if next < today: next ← (来年, base.月, base.日)
                       return next
  if mode='interval' : months ← max(1, entry.intervalMonths)
                       cursor ← base
                       while cursor < today: cursor ← cursor + months ヶ月   # 今日以降まで前進
                       return cursor
```
**設計意図**：車検(once/yearly)・保証(once)・納税(yearly)・消費期限/フィルタ掃除(interval)を
1つのダッシュボードで扱うため、期日を3モードに正規化。yearly は「毎年その月日」で過去なら翌年へ、
interval は基準日から nヶ月刻みで今日以降の最初の日を返す（過去に取り残さない）。

## SWD-renderDue（DueView）
割当：SWR-DUE-01,03,04,05

```
renderDue():
  today ← startOfToday()
  rows ← []
  各 item・各 item.dates: next ← computeNextDate(de,today); rows.push({item,cat,de,next})
  rows を next 昇順に整列
  limit ← filter='1m'?31 : '3m'?92 : ∞
  rows ← rows.filter(daysBetween(today,next) ≤ limit)          # 絞り込み(SWR-DUE-03)
  各 row:
    d ← daysBetween(today,next); lead ← de.leadDays ?? 30
    badge ← d<0 ? overdue : (d≤lead ? soon : ok)               # 色分け(SWR-DUE-04)
    label ← d<0 ? '期限切れ |d|日' : 'あとd日'
    行タップ → screen='ledger', 当該 category/item を開く         # 遷移(SWR-DUE-05)
```
**設計意図**：期日は item に内包されるが、表示はカテゴリ非依存に全 item を走査して集約
（新カテゴリでも自動で対象になる＝SWR-CAT-04）。

## SWD-ledgerModel（DataStore / PresetCatalog）
割当：SWR-CAT-01,02

```
起動時:
  categories ← loadJSON('app-secretary:categories', null)
  if !categories: categories ← PRESET_CATEGORIES に order 付与して保存   # 初回投入(SWR-CAT-02)
  items      ← loadJSON('app-secretary:items', [])
  settings   ← loadJSON('app-secretary:settings', {workerUrl:''})
getCategory(id): categories から一致idを線形検索
```
Category は `{id,name,icon,order,dateHints[],fields[]}`、fields 要素は
`{key,label,type:text|number|date|select,unit?,options?}`（SWR-CAT-01）。

## SWD-renderItemEdit（LedgerView）
割当：SWR-LEDGER-02,03,04

```
renderItemEdit():
  cat ← getCategory(state.categoryId); item ← items[state.itemId]
  各 field: 入力要素を生成（select は options、他は text/number/date）
            oninput → item.values[key] ← 値; persistItems()          # 都度保存(SWR-LEDGER-02)
  期日セクション:
    dateHints を「＋ラベル」チップで提示 → 押下で once の期日を1件追加(SWR-LEDGER-03)
    各 date: ラベル/モード/日付(＋interval時はnヶ月)/削除 を編集、都度 persistItems()
  メモ: textarea → item.memo, 都度保存(SWR-LEDGER-04)
  末尾に AiIntake.renderAiPanel(cat,item) を差し込む
```
**設計意図**：明示的な「保存ボタン」を置かず oninput で都度 persist（家族利用で保存忘れを防ぐ）。
削除は id ではなく編集中の単一 item を対象にするため index ずれは起きない。

## SWD-aiIntake（AiIntake, Rev 2）
割当：SWR-AI-01〜06,08

```
renderAiPanel(cat,item):
  if !settings.workerUrl: 設定導線を表示して終了                       # SWR-AI-08
  🎤 音声: SpeechRecognition(lang=ja-JP) → onresult でtextareaへ追記   # SWR-AI-01
          （window.SpeechRecognition||webkit... 無ければボタン無効）
  📝 下書き: requestExtract({mode:'extract', fields:cat.fields, text}) # SWR-AI-02
  📷 写真: <input type=file accept=image/* capture> → FileReader で
          base64 化 → requestExtract({mode:'extract-image', fields, imageBase64, mimeType})
          → 反映後 input.value='' で破棄（保存しない）                # SWR-AI-03,04
  注意書き: 送信の説明＋🔴機微情報を入力しない旨を常設                 # SWR-AI-05

applyDraft(item,cat,draft):
  各 cat.field: draft[key] があれば item.values[key] へ反映
  draft.dates[]: {label,date} があれば item.dates へ追加（mode 既定 once）
  draft.memo: あれば item.memo に追記
  persistItems(); render()      # 反映のみ。確定保存の判断は人（SWR-AI-06）

requestExtract(payload):
  fetch(settings.workerUrl, POST JSON) → ok なら res.json、失敗は throw（呼び元でエラー表示）
```
**設計意図**：AIは下書きを作るだけ（human-in-the-loop）。画像は要求のためだけに使い、
base64 を state/localStorage に残さない（SWR-AI-04）。プロンプトで機微情報を抽出させない（Worker側）。

## SWD-relayWorker（RelayWorker, 別デプロイ）
割当：SWR-AI-07 / SYR-N8

```
worker/index.js（Cloudflare Worker）:
  OPTIONS → CORS プリフライト応答
  POST:
    mode='extract'       → parts=[buildPrompt(fields), {text}]
    mode='extract-image' → parts=[buildPrompt(fields), {inline_data:{mime_type,data}}]
    Gemini generateContent(responseMimeType=application/json) 呼び出し
    → 返ったテキストを JSON.parse して返す
  buildPrompt(fields): フィールド定義(key/label/type/unit)を列挙し、
    「該当値のJSONだけ返す・期日は dates[] へ・🔴機微情報は抽出しない」と明示   # SWR-AI-05
  APIキー: env.GEMINI_API_KEY（secret）。プロンプトはWorker側で組む
```

## SWD-journal / SWD-timeline（JournalView, Rev 3）
割当：SWR-JOURNAL-01〜03, SWR-TL-01〜03

```
buildTimeline():                               # 俯瞰タイムライン（SWR-TL-01,02,03）
  today ← startOfToday()
  span ← filter='week'?7 : 'month'?31 : ∞
  events ← []
  各 journal e:
    if journalTag かつ e.tags に含まれない: skip     # タグ絞り込み(SWR-TL-03)
    if |daysBetween(today, e.date)| ≤ span: events.push({kind:'diary', date, entry:e})
  if journalTag 未設定:                              # 絞り込み中は期日を隠し日記に集中
    各 item・各 date: next ← computeNextDate(de,today)
      if 0 ≤ daysBetween(today,next) ≤ span: events.push({kind:'due', date:next, ...})
  byDay ← events を dateISO でグループ化
  return { days: byDay のキーを昇順ソートして反転(降順), byDay }   # 未来→今日→過去

renderJournal():
  クイック記録カード: 気分チップ(MOODS 5段, ローカル変数で選択・直接class切替)
                     本文 textarea ＋ 🎤音声(SpeechRecognition→追記)
                     タグ input(parseTags: 区切り[, 、 空白]→重複除去)
                     関連カテゴリ select(任意)
    「記録する」→ journal.push({id,date:今日,text,mood,tags,categoryId}); persistJournal(); render()
  期間フィルタ(今週/今月/すべて) → state.journalFilter
  タグバー: journal 内の全タグをチップ表示。タップで state.journalTag セット/解除
  タイムライン: buildTimeline() の days(降順)ごとに day-head(日付＋相対ラベル)＋
    その日の events を「期日→日記」順に描画。
    期日行タップ→当該itemの編集へ。日記行タップ→renderJournalEdit(state.journalId=e.id)

renderJournalEdit(): 日付/気分/本文(＋音声追記)/タグ/関連カテゴリを編集し都度 persistJournal()。削除可
```
**設計意図**：日記（過去・回顧）と期日（未来・予定）を today を中心に1軸へ載せ、降順で
「上=これから／下=これまで」を1画面で俯瞰させる（SWR-TL-01）。クイック記録は render を挟まず
ローカル変数＋直接DOM操作で気分/本文を保持し、保存忘れ・入力消失を防ぐ。
既定タブを日記にして「今日の全体像」を入口にする（設計判断：秘書＝日々の俯瞰）。

## SWD-dataIO（SettingsView）
割当：SWR-DATA-02,03 / SWR-CAT-03 / SWR-GUARD-01

```
exportData(): {categories,items,exportedAt} を Blob 化し
              'secretary-export-YYYY-MM-DD.json' でダウンロード              # SWR-DATA-02
インポート: JSON.parse → categories/items を差し替え → persist → render      # SWR-DATA-02
全消去: items=[]、categories=PRESET へ初期化 → persist                        # SWR-DATA-03
addCategoryFlow(): 名前・アイコンを prompt 入力 → 既定 name フィールド1つで追加  # SWR-CAT-03
ガードレール: 設定画面冒頭に🔴機微情報の注意書きを常設表示                       # SWR-GUARD-01
```

## データ構造（詳細）
```
Category : { id, name, icon, order:int, dateHints:[string], fields:[Field] }
Field    : { key, label, type:'text'|'number'|'date'|'select', unit?, options?:[string] }
Item     : { id, categoryId, values:{[key]:string}, dates:[DateEntry], memo:string, createdAt }
DateEntry: { label, mode:'once'|'yearly'|'interval', date:'YYYY-MM-DD', intervalMonths:int, leadDays:int }
Journal  : { id, date:'YYYY-MM-DD', text:string, mood:''|MOODS, tags:[string], categoryId:string, createdAt }
settings : { workerUrl:string }   localStorage keys: app-secretary:{categories,items,settings,journal}
```

## 実装位置（コードへのポインタ）
| ユニット | 03_implementation/index.html 内の関数/ブロック |
|----------|------------------------------|
| PRESET_CATEGORIES（17ドメイン） | `var PRESET_CATEGORIES = [...]` |
| load/persist / getCategory / uid | `loadJSON` `saveJSON` `persist*` `getCategory` `uid` |
| computeNextDate / daysBetween / toISO | `function computeNextDate(...)` ほか |
| 期日ダッシュボード | `function renderDue()` / `itemTitle()` |
| 台帳（一覧・編集） | `renderLedger` / `renderCategoryItems` / `renderItemEdit` |
| AI下書き | `renderAiPanel` / `applyDraft` / `requestExtract` |
| 日記・俯瞰タイムライン | `renderJournal` / `renderJournalEdit` / `buildTimeline` / `parseTags` / `relDayLabel` |
| 設定・入出力 | `renderSettings` / `addCategoryFlow` / `exportData` |
| Worker（別デプロイ） | `03_implementation/worker/index.js` |
| テスト用フック | `window.__secretaryApp = {...}` |
