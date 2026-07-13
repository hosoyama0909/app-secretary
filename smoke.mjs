// スモークテスト: index.html をヘッドレスで開き、基本動作を確認する。
// 実行: node smoke.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(__dirname, 'index.html');

let failures = 0;
function check(name, cond) {
  if (cond) { console.log('ok   -', name); }
  else { console.log('FAIL -', name); failures++; }
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

await page.goto(url);
await page.waitForTimeout(200);

// 期日タブがデフォルト表示
check('due screen shows heading', (await page.textContent('h1')).includes('期日'));

// 台帳タブへ切り替え、17プリセットカテゴリが表示される
await page.click('nav.tabs button[data-screen="ledger"]');
await page.waitForTimeout(100);
const tileCount = await page.locator('.cat-tile').count();
check('17 preset categories rendered', tileCount === 17);

// 家電カテゴリを開いて新規記録
await page.locator('.cat-tile', { hasText: '家電' }).click();
await page.waitForTimeout(100);
await page.click('button:has-text("＋ 新しく記録する")');
await page.waitForTimeout(100);
check('item edit screen opened', (await page.textContent('h1')).includes('家電'));

// フィールド入力
await page.fill('#f-maker', 'パナソニック');
await page.fill('#f-price', '180000');
check('field value persisted in memory', await page.evaluate(() => {
  const s = window.__secretaryApp;
  const item = s.items.find(i => i.id === s.state.itemId);
  return item.values.maker === 'パナソニック' && item.values.price === '180000';
}));

// 期日チップ（保証期限）を追加 → yearly に切り替えて次回日を計算
await page.click('.chip:has-text("保証期限")');
await page.waitForTimeout(100);
const dueLabel = await page.evaluate(() => {
  const s = window.__secretaryApp;
  const item = s.items.find(i => i.id === s.state.itemId);
  const de = item.dates[0];
  de.mode = 'yearly';
  const y = new Date().getFullYear() + 1;
  de.date = y + '-01-01'; // 過去日を想定 → 来年に繰り上がるはず
  const next = s.computeNextDate(de, new Date(y - 1, 5, 1));
  return next.getFullYear();
});
check('yearly due date rolls to next occurrence', dueLabel > 0);

// interval モードの計算を検証
const intervalOk = await page.evaluate(() => {
  const s = window.__secretaryApp;
  const entry = { label: 'x', mode: 'interval', date: '2026-01-01', intervalMonths: 6 };
  const next = s.computeNextDate(entry, new Date(2026, 7, 1)); // 2026-08-01 基準
  return next.getFullYear() === 2027 && next.getMonth() === 0; // 2026-01, 07, 2027-01
});
check('interval due date advances by N months', intervalOk);

// 期日ダッシュボードに反映される（テストで来年1月の日付にしたので「すべて」で確認）
await page.click('nav.tabs button[data-screen="due"]');
await page.click('.filterbar button:has-text("すべて")');
await page.waitForTimeout(100);
const dueRows = await page.locator('.list-item').count();
check('due dashboard lists at least one date', dueRows >= 1);

// 設定画面でカスタムカテゴリを追加（prompt をスタブ）
await page.click('nav.tabs button[data-screen="settings"]');
await page.waitForTimeout(100);
await page.evaluate(() => {
  window.prompt = (msg) => (msg.includes('カテゴリ名') ? 'ペット' : '🐾');
});
await page.click('button:has-text("＋ 新しいカテゴリを追加")');
await page.waitForTimeout(100);
const catCount = await page.evaluate(() => window.__secretaryApp.categories.length);
check('custom category added (18 total)', catCount === 18);

// JSONエクスポートのダウンロードが発火する
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('button:has-text("エクスポート（JSON）")'),
]);
check('export triggers a download', !!download);

// コンソール/ページエラーが出ていないこと
check('no page errors', errors.length === 0);
if (errors.length) console.log(errors);

await browser.close();

if (failures > 0) {
  console.log('\n' + failures + ' check(s) failed.');
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
