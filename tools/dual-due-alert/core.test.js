const { test } = require('node:test');
const assert = require('node:assert');
const {
  daysUntilDue, renderTemplate, parseOffsets,
  parseSentState, markSentState, selectDue, buildMessage,
} = require('./core.js');

const D = (s) => new Date(s + 'T00:00:00');

test('daysUntilDue: 日付差を日数で返す', () => {
  assert.equal(daysUntilDue(D('2026-07-13'), D('2026-07-20')), 7);
  assert.equal(daysUntilDue(D('2026-07-13'), D('2026-07-13')), 0);
  assert.equal(daysUntilDue(D('2026-07-13'), D('2026-07-10')), -3);
});

test('parseOffsets: カンマ区切りを整数配列に', () => {
  assert.deepEqual(parseOffsets('7,3,1,0'), [7, 3, 1, 0]);
  assert.deepEqual(parseOffsets('7  1'), [7, 1]);
  assert.deepEqual(parseOffsets(''), []);
});

test('renderTemplate: 差し込み変数を置換', () => {
  const out = renderTemplate('{取引先} へ {金額}円（{期日} 残り{残り日数}日）', {
    取引先: 'A社', 金額: 5000, 期日: '2026-07-20', 残り日数: 3,
  });
  assert.equal(out, 'A社 へ 5000円（2026-07-20 残り3日）');
});

test('markSentState: ラベルを追記し重複しない', () => {
  assert.equal(markSentState('', '-7'), '-7');
  assert.equal(markSentState('-7', '-3'), '-7 -3');
  assert.equal(markSentState('-7 -3', '-7'), '-7 -3');
});

test('selectDue: 買掛は期日N日前(offset一致)のみ拾う', () => {
  const rows = [
    { index: 2, kind: '買掛', party: 'A社', amount: 5000, dueDate: D('2026-07-20'), settled: false, sentState: '', enabled: true },
    { index: 3, kind: '買掛', party: 'B社', amount: 8000, dueDate: D('2026-07-18'), settled: false, sentState: '', enabled: true },
  ];
  const out = selectDue(rows, D('2026-07-13'), { offsets: [7, 3, 1, 0], overdueAlert: true });
  assert.equal(out.length, 1);
  assert.equal(out[0].index, 2);
  assert.equal(out[0].offsetLabel, '-7');
});

test('selectDue: 売掛は超過のみ拾う（期日前は拾わない）', () => {
  const rows = [
    { index: 2, kind: '売掛', party: 'C社', amount: 9000, dueDate: D('2026-07-20'), settled: false, sentState: '', enabled: true },
    { index: 3, kind: '売掛', party: 'D社', amount: 4000, dueDate: D('2026-07-10'), settled: false, sentState: '', enabled: true },
  ];
  const out = selectDue(rows, D('2026-07-13'), { offsets: [7, 3, 1, 0], overdueAlert: true });
  assert.equal(out.length, 1);
  assert.equal(out[0].index, 3);
  assert.equal(out[0].offsetLabel, '超過');
});

test('selectDue: 買掛の当日(0)は拾う／売掛の当日は督促しない', () => {
  const rows = [
    { index: 2, kind: '買掛', party: 'A社', amount: 5000, dueDate: D('2026-07-13'), settled: false, sentState: '', enabled: true },
    { index: 3, kind: '売掛', party: 'B社', amount: 8000, dueDate: D('2026-07-13'), settled: false, sentState: '', enabled: true },
  ];
  const out = selectDue(rows, D('2026-07-13'), { offsets: [0], overdueAlert: true });
  assert.equal(out.length, 1);
  assert.equal(out[0].index, 2);
  assert.equal(out[0].offsetLabel, '0');
});

test('selectDue: 済=trueは除外', () => {
  const rows = [
    { index: 2, kind: '買掛', party: 'A社', amount: 5000, dueDate: D('2026-07-13'), settled: true, sentState: '', enabled: true },
  ];
  const out = selectDue(rows, D('2026-07-13'), { offsets: [0], overdueAlert: true });
  assert.equal(out.length, 0);
});

test('selectDue: 送信状態で重複除外／有効FALSEで除外', () => {
  const rows = [
    { index: 2, kind: '買掛', party: 'A社', amount: 5000, dueDate: D('2026-07-13'), settled: false, sentState: '0', enabled: true },
    { index: 3, kind: '買掛', party: 'B社', amount: 8000, dueDate: D('2026-07-13'), settled: false, sentState: '', enabled: false },
  ];
  const out = selectDue(rows, D('2026-07-13'), { offsets: [0], overdueAlert: true });
  assert.equal(out.length, 0);
});

test('selectDue: 売掛の督促OFFなら超過でも拾わない', () => {
  const rows = [
    { index: 2, kind: '売掛', party: 'D社', amount: 4000, dueDate: D('2026-07-10'), settled: false, sentState: '', enabled: true },
  ];
  const out = selectDue(rows, D('2026-07-13'), { offsets: [7, 3, 1, 0], overdueAlert: false });
  assert.equal(out.length, 0);
});

test('selectDue: 期日不正(未入力/非Date)は除外', () => {
  const rows = [
    { index: 2, kind: '買掛', party: 'A社', amount: 5000, dueDate: '', settled: false, sentState: '', enabled: true },
    { index: 3, kind: '売掛', party: 'B社', amount: 8000, dueDate: new Date('invalid'), settled: false, sentState: '', enabled: true },
  ];
  const out = selectDue(rows, D('2026-07-13'), { offsets: [0], overdueAlert: true });
  assert.equal(out.length, 0);
});

test('buildMessage: 種別ごとに文面を切替', () => {
  const templates = {
    買掛: '【支払】{取引先} への {金額}円 の支払期日は {期日}（残り{残り日数}日）',
    売掛: '【入金遅延】{取引先} からの {金額}円 が {期日}を過ぎています',
  };
  const pay = buildMessage({ kind: '買掛', party: 'A社', amount: 5000, dueDate: D('2026-07-20'), daysUntilDue: 7 }, templates);
  assert.match(pay, /【支払】A社 への 5000円/);
  assert.match(pay, /2026-07-20（残り7日）/);
  const recv = buildMessage({ kind: '売掛', party: 'D社', amount: 4000, dueDate: D('2026-07-10'), daysUntilDue: -3 }, templates);
  assert.match(recv, /【入金遅延】D社 からの 4000円/);
});
