const { test } = require('node:test');
const assert = require('node:assert');
const { filterPending } = require('./api-shape.js');

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
