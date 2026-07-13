const { test } = require('node:test');
const assert = require('node:assert');
const { extractJobIds } = require('./parser.js');

test('extractJobIds: public/jobs のIDだけを抽出し messages は無視', () => {
  const body = [
    'お世話になります。',
    'https://crowdworks.jp/public/jobs/13286576',
    'https://crowdworks.jp/messages/416582123?ref=um_invitation',
  ].join('\n');
  assert.deepStrictEqual(extractJobIds(body), ['13286576']);
});

test('extractJobIds: 複数案件を出現順・重複排除で返す', () => {
  const body = 'a https://crowdworks.jp/public/jobs/111 b https://crowdworks.jp/public/jobs/222 c https://crowdworks.jp/public/jobs/111';
  assert.deepStrictEqual(extractJobIds(body), ['111', '222']);
});

test('extractJobIds: crowdworks.jp 以外のホストのURLは拾わない', () => {
  const body = 'https://evil-example.com/public/jobs/999 と https://crowdworks.jp/public/jobs/111';
  assert.deepStrictEqual(extractJobIds(body), ['111']);
});

test('extractJobIds: 該当なしは空配列', () => {
  assert.deepStrictEqual(extractJobIds('案件URLなし'), []);
});

const { cleanTitle } = require('./parser.js');

test('cleanTitle: CW接頭辞を除去し案件側の括弧は残す', () => {
  const s = '【クラウドワークス】【Instagram投稿作成案件】投稿を一緒に盛り上げる仲間を募集します！（※学生不可）について相談がありました';
  assert.strictEqual(cleanTitle(s), '【Instagram投稿作成案件】投稿を一緒に盛り上げる仲間を募集します！（※学生不可）');
});

test('cleanTitle: 接頭辞や定型句が無ければそのまま', () => {
  assert.strictEqual(cleanTitle('スプレッドシート自動化のお仕事'), 'スプレッドシート自動化のお仕事');
});

const { detectSourceType } = require('./parser.js');

test('detectSourceType: 相談メールはスカウト', () => {
  assert.strictEqual(detectSourceType('…について相談がありました', '見積もり相談などをさせて頂きたい'), 'スカウト');
});

test('detectSourceType: 判定材料が無ければその他', () => {
  assert.strictEqual(detectSourceType('会員登録完了のご案内', 'はじめてガイド'), 'その他');
});

const { parseEmail } = require('./parser.js');

test('parseEmail: スカウトメールから1レコード生成', () => {
  const email = {
    subject: '【クラウドワークス】【Instagram投稿作成案件】投稿を一緒に盛り上げる仲間を募集します！（※学生不可）について相談がありました',
    body: 'PopStar.です。\nhttps://crowdworks.jp/public/jobs/13286576\nhttps://crowdworks.jp/messages/416582123',
  };
  assert.deepStrictEqual(parseEmail(email), [{
    jobId: '13286576',
    url: 'https://crowdworks.jp/public/jobs/13286576',
    title: '【Instagram投稿作成案件】投稿を一緒に盛り上げる仲間を募集します！（※学生不可）',
    sourceType: 'スカウト',
  }]);
});

test('parseEmail: 案件URLの無いメールは空配列', () => {
  assert.deepStrictEqual(parseEmail({ subject: '認証コード', body: 'コードは1234' }), []);
});

const { computeNewRows } = require('./parser.js');

const recs = [
  { jobId: '111', url: 'https://crowdworks.jp/public/jobs/111', title: 'A案件', sourceType: 'スカウト' },
  { jobId: '222', url: 'https://crowdworks.jp/public/jobs/222', title: 'B案件', sourceType: 'その他' },
  { jobId: '111', url: 'https://crowdworks.jp/public/jobs/111', title: 'A案件', sourceType: 'スカウト' },
];

test('computeNewRows: 既存IDとバッチ内重複を除外し列A〜Jの行を返す', () => {
  const rows = computeNewRows(recs, ['222'], '2026-07-07T10:00:00');
  assert.deepStrictEqual(rows, [
    ['111', '2026-07-07T10:00:00', '', 'A案件', '', '', '', 'https://crowdworks.jp/public/jobs/111', 'スカウト', '未判定'],
  ]);
});

test('computeNewRows: 全て既存なら空', () => {
  assert.deepStrictEqual(computeNewRows(recs, ['111', '222'], 'now'), []);
});

const { normalizeJobRecords } = require('./parser.js');

test('normalizeJobRecords: 全項目そろった検索結果はそのままレコード化', () => {
  const jobs = [{ jobId: '13300001', title: 'GAS自動化案件', url: 'https://crowdworks.jp/public/jobs/13300001', sourceType: '保存検索' }];
  assert.deepStrictEqual(normalizeJobRecords(jobs), [
    { jobId: '13300001', url: 'https://crowdworks.jp/public/jobs/13300001', title: 'GAS自動化案件', sourceType: '保存検索' },
  ]);
});

test('normalizeJobRecords: url未指定なら jobId から生成', () => {
  const jobs = [{ jobId: '13300002', title: 'A案件' }];
  assert.deepStrictEqual(normalizeJobRecords(jobs), [
    { jobId: '13300002', url: 'https://crowdworks.jp/public/jobs/13300002', title: 'A案件', sourceType: '保存検索' },
  ]);
});

test('normalizeJobRecords: sourceType未指定は「保存検索」を既定にする', () => {
  assert.strictEqual(normalizeJobRecords([{ jobId: '13300003', title: 'B' }])[0].sourceType, '保存検索');
});

test('normalizeJobRecords: jobIdが数字でない/空のレコードは除外', () => {
  const jobs = [
    { jobId: '13300004', title: 'OK' },
    { jobId: 'abc', title: 'NG英字' },
    { jobId: '', title: 'NG空' },
    { title: 'NGなし' },
  ];
  assert.deepStrictEqual(normalizeJobRecords(jobs).map(function (r) { return r.jobId; }), ['13300004']);
});

test('normalizeJobRecords: 数値jobIdは文字列化して扱う', () => {
  assert.strictEqual(normalizeJobRecords([{ jobId: 13300005, title: 'C' }])[0].jobId, '13300005');
});

test('normalizeJobRecords: null/未定義入力は空配列', () => {
  assert.deepStrictEqual(normalizeJobRecords(null), []);
  assert.deepStrictEqual(normalizeJobRecords(undefined), []);
});
