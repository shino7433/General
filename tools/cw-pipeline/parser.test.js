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
  const body = 'a /public/jobs/111 b /public/jobs/222 c /public/jobs/111';
  assert.deepStrictEqual(extractJobIds(body), ['111', '222']);
});

test('extractJobIds: 該当なしは空配列', () => {
  assert.deepStrictEqual(extractJobIds('案件URLなし'), []);
});
