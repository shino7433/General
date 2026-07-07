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

if (typeof module !== 'undefined') {
  module.exports = { extractJobIds: extractJobIds, cleanTitle: cleanTitle };
}
