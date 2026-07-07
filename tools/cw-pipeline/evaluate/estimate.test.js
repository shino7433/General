const { test } = require('node:test');
const assert = require('node:assert');
const { estimate } = require('./estimate.js');

test('estimate: 評価0件(low)×small は下限レンジ・2〜4h', () => {
  assert.deepStrictEqual(estimate({ evalCount:0, size:'small' }), { 見積:'5,000〜10,000円', 想定実稼働:'2〜4h' });
});
test('estimate: 評価5件(mid)×medium は中央レンジ・4〜8h', () => {
  assert.deepStrictEqual(estimate({ evalCount:5, size:'medium' }), { 見積:'20,000〜40,000円', 想定実稼働:'4〜8h' });
});
test('estimate: 評価12件(high)×large', () => {
  assert.deepStrictEqual(estimate({ evalCount:12, size:'large' }), { 見積:'50,000〜80,000円', 想定実稼働:'8〜16h' });
});
test('estimate: 既定は small・評価0(low)', () => {
  assert.deepStrictEqual(estimate({}), { 見積:'5,000〜10,000円', 想定実稼働:'2〜4h' });
});
