function filterPending(rows) {
  var out = [];
  (rows || []).forEach(function (r, i) {
    if (String(r[9]) === '未判定') {
      out.push({
        jobId: String(r[0]),
        url: String(r[7]),
        title: String(r[3]),
        sourceType: String(r[8]),
        row: i + 2,
      });
    }
  });
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = { filterPending: filterPending };
}
