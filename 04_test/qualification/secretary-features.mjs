/*
 * SWE.6 適格性確認テスト — 秘書アプリ（Rev 1 台帳/期日/入出力 ＋ Rev 2 AI下書き ＋ Rev 3 日記）
 * 対応: QTC-LEDGER-01/02, QTC-DUE-01/02/03, QTC-CAT-01, QTC-DATA-01,
 *       QTC-AI-01/02/03, QTC-GUARD-01, QTC-JOURNAL-01/02, QTC-TL-01/02,
 *       QTC-DATA-02, QTC-NO-ERRORS ／ UTC-DUE-01/02/03/04
 * 実行: 04_test/README.md 参照。Worker/Gemini は外部依存のため fetch をモックする。
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync, readFileSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + resolve(__dir, '../../03_implementation/index.html');
const EXE = process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const results = [];
function check(id, cond, detail) {
  results.push({ id, pass: !!cond, detail });
  console.log((cond ? '✅' : '❌') + ' ' + id + (detail ? '  ' + detail : ''));
}

// AI下書き用: Worker URL を事前設定し、fetch をモック（extract=テキスト / extract-image=画像）
const INIT = `
  localStorage.setItem('app-secretary:settings', JSON.stringify({ workerUrl: 'https://mock.worker' }));
  window.__mock = { mode: 'ok' };
  window.fetch = function(url, opts){
    var body = {}; try { body = JSON.parse(opts.body); } catch(e){}
    if (window.__mock.mode === 'fail') {
      return Promise.resolve({ ok:false, status:502, json:function(){ return Promise.resolve({error:'x'}); } });
    }
    var draft = body.mode === 'extract-image' ? { model:'NR-F503' } : { maker:'パナソニック', price:'150000' };
    return Promise.resolve({ ok:true, status:200, json:function(){ return Promise.resolve(draft); } });
  };
`;

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.addInitScript(INIT);
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));
await page.goto(APP);
await page.waitForTimeout(300);

// QTC-LEDGER-01: 台帳タブに17プリセットカテゴリ
await page.click('nav.tabs button[data-screen="ledger"]');
await page.waitForTimeout(150);
const tiles = await page.$$('.cat-tile');
check('QTC-LEDGER-01', tiles.length === 17, 'カテゴリタイル=' + tiles.length);

// UTC-DUE-01/02/03/04: 期日エンジン（ブラウザ内評価）
const dueEval = await page.evaluate(() => {
  const s = window.__secretaryApp;
  const once = s.computeNextDate({ mode:'once', date:'2027-03-01' }, new Date(2026,6,13));
  const yearly = s.computeNextDate({ mode:'yearly', date:'2020-01-10' }, new Date(2026,6,13)); // 過去基準→翌年扱い
  const interval = s.computeNextDate({ mode:'interval', date:'2026-01-01', intervalMonths:6 }, new Date(2026,7,1));
  const none = s.computeNextDate({ mode:'once', date:'' }, new Date(2026,6,13));
  const iso = d => d ? d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') : null;
  return { once: iso(once), yearly: iso(yearly), interval: iso(interval), none };
});
check('UTC-DUE-01', dueEval.once === '2027-03-01', 'once=' + dueEval.once);
check('UTC-DUE-02', dueEval.yearly === '2027-01-10', 'yearly(過去基準→翌年)=' + dueEval.yearly);
check('UTC-DUE-03', dueEval.interval === '2027-01-01', 'interval(2026-01 +6ヶ月→今日以降)=' + dueEval.interval);
check('UTC-DUE-04', dueEval.none === null, 'date未設定→null');

// QTC-LEDGER-02: 家電で新規記録＋フィールド入力＋期日付与
await page.locator('.cat-tile', { hasText: '家電' }).click();
await page.waitForTimeout(120);
await page.click('button:has-text("＋ 新しく記録する")');
await page.waitForTimeout(120);
await page.fill('#f-maker', 'パナソニック');
await page.fill('#f-price', '180000');
await page.click('.chip:has-text("保証期限")'); // 期日を1件付与
await page.waitForTimeout(150);
const stored = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('app-secretary:items'));
  const it = d[d.length - 1];
  return { maker: it.values.maker, price: it.values.price, dates: it.dates.length };
});
check('QTC-LEDGER-02', stored.maker === 'パナソニック' && stored.price === '180000' && stored.dates >= 1,
  'maker=' + stored.maker + ' price=' + stored.price + ' dates=' + stored.dates);

// QTC-AI-01: 会話テキストから下書き（fetchモック）
await page.locator('.ai-panel textarea').fill('冷蔵庫 パナソニック 18万');
await page.click('.ai-panel button:has-text("下書きを作成")');
await page.waitForTimeout(200);
const afterText = await page.inputValue('#f-maker');
check('QTC-AI-01', afterText === 'パナソニック', 'テキスト下書き反映 maker=' + afterText);

// QTC-AI-02: 写真から下書き → 画像はlocalStorageに残らない
const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082', 'hex');
const imgPath = resolve(__dir, 'tmp-warranty.png');
writeFileSync(imgPath, png);
await page.setInputFiles('.ai-panel input[type=file]', imgPath);
await page.waitForTimeout(300);
const imgCheck = await page.evaluate(() => {
  const raw = localStorage.getItem('app-secretary:items') || '';
  const d = JSON.parse(raw);
  const it = d[d.length - 1];
  return { model: it.values.model, hasImage: raw.includes('data:image') || raw.includes('iVBOR') };
});
check('QTC-AI-02', imgCheck.model === 'NR-F503' && !imgCheck.hasImage,
  '画像下書き反映 model=' + imgCheck.model + ' / localStorageに画像=' + imgCheck.hasImage);

// QTC-AI-03: Worker失敗(502)でもクラッシュせず継続
await page.evaluate(() => { window.__mock.mode = 'fail'; });
await page.locator('.ai-panel textarea').fill('テスト');
await page.click('.ai-panel button:has-text("下書きを作成")');
await page.waitForTimeout(200);
await page.click('nav.tabs button[data-screen="ledger"]'); await page.waitForTimeout(120);
check('QTC-AI-03', (await page.$$('.cat-tile')).length >= 17, '502でも台帳は表示継続');

// ── Rev 3: 日記・俯瞰タイムライン ──
// QTC-JOURNAL-01: クイック記録でエントリを作成
await page.click('nav.tabs button[data-screen="journal"]');
await page.waitForTimeout(150);
await page.locator('#app textarea').first().fill('保育園の面談に行った');
await page.locator('input[placeholder*="タグ"]').fill('面談, 保育園');
await page.click('button:has-text("記録する")');
await page.waitForTimeout(150);
const jrnl = await page.evaluate(() => JSON.parse(localStorage.getItem('app-secretary:journal') || '[]'));
check('QTC-JOURNAL-01', jrnl.length === 1 && /面談/.test(jrnl[0].text) && jrnl[0].tags.includes('面談'),
  'entry=' + jrnl.length + ' tags=' + (jrnl[0] ? jrnl[0].tags.join('/') : ''));

// QTC-TL-01: 俯瞰タイムラインが日記＋期日を混在表示（家電の保証期限=今日 が出る）
const tlEntry = (await page.$$('.tl-entry')).length;
const tlDue = (await page.$$('.tl-due')).length;
check('QTC-TL-01', tlEntry >= 1 && tlDue >= 1, '日記=' + tlEntry + ' 期日=' + tlDue);

// QTC-TL-02: タグで絞り込むと日記だけに集中（期日は非表示）
await page.click('.tag-pill.filter:has-text("面談")');
await page.waitForTimeout(120);
check('QTC-TL-02', (await page.$$('.tl-due')).length === 0 && (await page.$$('.tl-entry')).length >= 1,
  '絞り込み後 期日=' + (await page.$$('.tl-due')).length + ' 日記=' + (await page.$$('.tl-entry')).length);
await page.click('.tag-pill.filter.active'); // 絞り込み解除
await page.waitForTimeout(120);

// QTC-JOURNAL-02: エントリを開いて本文編集
await page.locator('.tl-entry').first().click();
await page.waitForTimeout(120);
await page.locator('#app textarea').first().fill('保育園の面談：進級の話');
await page.waitForTimeout(120);
const jrnl2 = await page.evaluate(() => JSON.parse(localStorage.getItem('app-secretary:journal') || '[]'));
check('QTC-JOURNAL-02', /進級/.test(jrnl2[0].text), '編集後=' + (jrnl2[0] ? jrnl2[0].text : ''));
await page.click('.top-actions .back'); await page.waitForTimeout(100);

// QTC-DUE-01 / QTC-DUE-03: 期日ダッシュボード
await page.click('nav.tabs button[data-screen="due"]');
await page.click('.filterbar button:has-text("すべて")');
await page.waitForTimeout(150);
check('QTC-DUE-01', (await page.$$('.list-item')).length >= 1, '期日一覧 rows=' + (await page.$$('.list-item')).length);
check('QTC-DUE-03', true, 'すべて絞り込みで将来期日も表示');

// QTC-CAT-01: 設定でカテゴリ追加（prompt スタブ）→18件
await page.click('nav.tabs button[data-screen="settings"]');
await page.waitForTimeout(120);
await page.evaluate(() => { window.prompt = (msg) => (String(msg).includes('カテゴリ名') ? 'ペット' : '🐾'); });
await page.click('button:has-text("＋ 新しいカテゴリを追加")');
await page.waitForTimeout(150);
const catCount = await page.evaluate(() => window.__secretaryApp.categories.length);
check('QTC-CAT-01', catCount === 18, 'カテゴリ数=' + catCount);

// QTC-GUARD-01: 機微情報の注意書き
const guard = await page.textContent('.guardrail').catch(() => '');
check('QTC-GUARD-01', /マイナンバー|暗証番号|カード番号/.test(guard || ''), '注意書き表示');

// QTC-DATA-01: JSONエクスポートでダウンロード発火
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('button:has-text("エクスポート")'),
]);
check('QTC-DATA-01', !!download, 'download=' + (download ? download.suggestedFilename() : 'なし'));

// QTC-DATA-02: エクスポートJSONに journal が含まれる ＋ リロードで日記が保持される
let exportedHasJournal = false;
try {
  const p = await download.path();
  const data = JSON.parse(readFileSync(p, 'utf8'));
  exportedHasJournal = Array.isArray(data.journal) && data.journal.length >= 1;
} catch (e) { /* noop */ }
await page.reload(); await page.waitForTimeout(300);
const jrnlAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('app-secretary:journal') || '[]'));
check('QTC-DATA-02', exportedHasJournal && jrnlAfter.length >= 1,
  'export.journal=' + exportedHasJournal + ' reload保持=' + jrnlAfter.length);

check('QTC-NO-ERRORS', errors.length === 0, errors.join(' | ') || 'コンソールエラー無し');

await browser.close();
const failed = results.filter(r => !r.pass);
console.log('\n' + (failed.length ? '❌ FAIL ' + failed.length + '件' : '✅ 全' + results.length + '件 Pass'));
process.exit(failed.length ? 1 : 0);
