const { test } = require('node:test');
const assert = require('node:assert');
const { parseOffsets } = require('./core.js');

test('parseOffsets: カンマ区切りを整数配列に', () => {
  assert.deepStrictEqual(parseOffsets('7,1,0'), [7, 1, 0]);
});
test('parseOffsets: 空白混じり・不正トークンを除外', () => {
  assert.deepStrictEqual(parseOffsets(' 7 , x, 1 '), [7, 1]);
});
test('parseOffsets: 空入力は空配列', () => {
  assert.deepStrictEqual(parseOffsets(''), []);
  assert.deepStrictEqual(parseOffsets(null), []);
});
