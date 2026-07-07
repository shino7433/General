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

if (typeof module !== 'undefined') {
  module.exports = { extractJobIds: extractJobIds };
}
