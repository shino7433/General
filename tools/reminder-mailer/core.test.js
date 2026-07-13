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

const { parseSentState, markSentState } = require('./core.js');

test('parseSentState: 空白区切りをラベル配列に', () => {
  assert.deepStrictEqual(parseSentState('-7 0'), ['-7', '0']);
  assert.deepStrictEqual(parseSentState(''), []);
});
test('markSentState: 新規ラベルを追記', () => {
  assert.strictEqual(markSentState('-7', '0'), '-7 0');
});
test('markSentState: 既存ラベルは重複させない（冪等）', () => {
  assert.strictEqual(markSentState('-7 0', '-7'), '-7 0');
});

const { buildSlackPayload, buildLinePayload } = require('./core.js');

test('buildSlackPayload: textに本文を入れる', () => {
  assert.deepStrictEqual(buildSlackPayload('期限です'), { text: '期限です' });
});
test('buildLinePayload: to と messages を組む', () => {
  assert.deepStrictEqual(buildLinePayload('期限です', 'U123'), {
    to: 'U123', messages: [{ type: 'text', text: '期限です' }],
  });
});

const { selectDue } = require('./core.js');

const baseConfig = { offsets: [7, 1, 0], overdueAlert: true };
function row(over) {
  return Object.assign({ index: 2, dueDate: new Date(2026, 6, 20), subject: '件名', body: '本文', enabled: true, sentState: '' }, over);
}

test('selectDue: オフセット一致で発火（7日前→-7）', () => {
  const out = selectDue([row({ dueDate: new Date(2026, 6, 20) })], new Date(2026, 6, 13), baseConfig);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].offsetLabel, '-7');
});
test('selectDue: 当日は0ラベル', () => {
  const out = selectDue([row({ dueDate: new Date(2026, 6, 13) })], new Date(2026, 6, 13), baseConfig);
  assert.strictEqual(out[0].offsetLabel, '0');
});
test('selectDue: 送信済みオフセットは発火しない', () => {
  const out = selectDue([row({ dueDate: new Date(2026, 6, 20), sentState: '-7' })], new Date(2026, 6, 13), baseConfig);
  assert.deepStrictEqual(out, []);
});
test('selectDue: 超過はoverdueAlert時に一度だけ', () => {
  const on = selectDue([row({ dueDate: new Date(2026, 6, 10) })], new Date(2026, 6, 13), baseConfig);
  assert.strictEqual(on[0].offsetLabel, '超過');
  const already = selectDue([row({ dueDate: new Date(2026, 6, 10), sentState: '超過' })], new Date(2026, 6, 13), baseConfig);
  assert.deepStrictEqual(already, []);
  const off = selectDue([row({ dueDate: new Date(2026, 6, 10) })], new Date(2026, 6, 13), { offsets: [7, 1, 0], overdueAlert: false });
  assert.deepStrictEqual(off, []);
});
test('selectDue: 無効行と不正日付はスキップ', () => {
  const disabled = selectDue([row({ enabled: false })], new Date(2026, 6, 13), baseConfig);
  assert.deepStrictEqual(disabled, []);
  const bad = selectDue([row({ dueDate: new Date('invalid') })], new Date(2026, 6, 13), baseConfig);
  assert.deepStrictEqual(bad, []);
});

test('selectDue: 出力に dueDate を含む（{期限日}差し込み用）', () => {
  const due = new Date(2026, 6, 20);
  const out = selectDue([row({ dueDate: due })], new Date(2026, 6, 13), baseConfig);
  assert.strictEqual(out[0].dueDate.getTime(), due.getTime());
});
