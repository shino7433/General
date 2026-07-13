const { test } = require('node:test');
const assert = require('node:assert');
const { parseOffsets, daysUntilDue } = require('./core.js');

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

test('daysUntilDue: 未来はプラス', () => {
  assert.strictEqual(daysUntilDue(new Date(2026, 6, 13), new Date(2026, 6, 20)), 7);
});
test('daysUntilDue: 当日は0（時刻差を無視）', () => {
  assert.strictEqual(daysUntilDue(new Date(2026, 6, 13, 23, 0), new Date(2026, 6, 13, 1, 0)), 0);
});
test('daysUntilDue: 超過はマイナス、月またぎも正しい', () => {
  assert.strictEqual(daysUntilDue(new Date(2026, 7, 2), new Date(2026, 6, 31)), -2);
});

const { renderTemplate } = require('./core.js');

test('renderTemplate: 日本語キーを差し込む', () => {
  const out = renderTemplate('『{件名}』は残り{残り日数}日（{期限日}）', {
    件名: '請求書A', 残り日数: 3, 期限日: '2026-07-20',
  });
  assert.strictEqual(out, '『請求書A』は残り3日（2026-07-20）');
});
test('renderTemplate: 未知のプレースホルダは残す', () => {
  assert.strictEqual(renderTemplate('{宛先}様', {}), '{宛先}様');
});
