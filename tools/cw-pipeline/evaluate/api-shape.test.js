const { test } = require('node:test');
const assert = require('node:assert');
const { filterPending, findRowByJobId, evalToRowUpdates } = require('./api-shape.js');

test('filterPending: 未判定行のみを{jobId,url,title,sourceType,row}で返す', () => {
  const rows = [
    ['111','2026-07-07','','A案件','','','','https://crowdworks.jp/public/jobs/111','スカウト','未判定'],
    ['222','2026-07-07','','B案件','','','','https://crowdworks.jp/public/jobs/222','スカウト','Go'],
    ['333','2026-07-07','','C案件','','','','https://crowdworks.jp/public/jobs/333','おすすめ','未判定'],
  ];
  assert.deepStrictEqual(filterPending(rows), [
    { jobId:'111', url:'https://crowdworks.jp/public/jobs/111', title:'A案件', sourceType:'スカウト', row:2 },
    { jobId:'333', url:'https://crowdworks.jp/public/jobs/333', title:'C案件', sourceType:'おすすめ', row:4 },
  ]);
});

test('filterPending: 未判定なしは空配列', () => {
  assert.deepStrictEqual(filterPending([['1','','','','','','','','','Go']]), []);
});

test('findRowByJobId: 一致インデックス(0-based)/なければ-1/数値も文字列一致', () => {
  assert.strictEqual(findRowByJobId(['111','222','333'], '222'), 1);
  assert.strictEqual(findRowByJobId(['111','222'], '999'), -1);
  assert.strictEqual(findRowByJobId(['111'], 111), 0);
});

test('evalToRowUpdates: 提供キーを列マッピングし、判定はJ(10)とK(11)両方に積む', () => {
  const ev = { 判定:'Go', 判定理由:'要件明確', 提案数:3, 見積:'1万〜2万円', 想定実稼働:'2〜4h', 提案ドラフト:'本文', カテゴリ:'業務システム', 予算:'1万〜3万', 報酬形態:'固定' };
  assert.deepStrictEqual(evalToRowUpdates(ev), [
    { col:5, value:'業務システム' },
    { col:6, value:'1万〜3万' },
    { col:7, value:'固定' },
    { col:12, value:'要件明確' },
    { col:13, value:3 },
    { col:14, value:'1万〜2万円' },
    { col:15, value:'2〜4h' },
    { col:16, value:'本文' },
    { col:10, value:'Go' },
    { col:11, value:'Go' },
  ]);
});

test('evalToRowUpdates: 未提供キーはスキップ', () => {
  assert.deepStrictEqual(evalToRowUpdates({ 判定:'NoGo', 判定理由:'提案多数' }), [
    { col:12, value:'提案多数' },
    { col:10, value:'NoGo' },
    { col:11, value:'NoGo' },
  ]);
});
