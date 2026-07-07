function extractJobIds(text) {
  var re = /(?:crowdworks\.jp)?\/public\/jobs\/(\d+)/g;
  var ids = [];
  var seen = {};
  var m;
  while ((m = re.exec(String(text || ''))) !== null) {
    if (!seen[m[1]]) { seen[m[1]] = true; ids.push(m[1]); }
  }
  return ids;
}

function cleanTitle(subject) {
  var s = String(subject || '').trim();
  s = s.replace(/^【クラウドワークス】\s*/, '');
  s = s.replace(/(について相談がありました|のご案内|のお知らせ)\s*$/, '');
  return s.trim();
}

function detectSourceType(subject, body) {
  var text = String(subject || '') + '\n' + String(body || '');
  if (/相談がありました|スカウト|見積もり相談/.test(text)) return 'スカウト';
  if (/新着のお仕事|保存した検索条件|条件に一致|新着のお知らせ/.test(text)) return '保存検索';
  if (/おすすめ|あなたにおすすめ|ピックアップ/.test(text)) return 'おすすめ';
  return 'その他';
}

if (typeof module !== 'undefined') {
  module.exports = {
    extractJobIds: extractJobIds,
    cleanTitle: cleanTitle,
    detectSourceType: detectSourceType,
  };
}
