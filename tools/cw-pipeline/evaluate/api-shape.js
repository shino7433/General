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

function findRowByJobId(idColumn, jobId) {
  var target = String(jobId);
  for (var i = 0; i < (idColumn || []).length; i++) {
    if (String(idColumn[i]) === target) return i;
  }
  return -1;
}

function evalToRowUpdates(ev) {
  ev = ev || {};
  var map = {
    'カテゴリ': 5, '予算': 6, '報酬形態': 7,
    '判定理由': 12, '提案数': 13, '見積': 14, '想定実稼働': 15,
    '提案ドラフト': 16, '結果メモ': 18,
  };
  var updates = [];
  Object.keys(map).forEach(function (k) {
    if (ev[k] !== undefined && ev[k] !== null) updates.push({ col: map[k], value: ev[k] });
  });
  if (ev['判定'] !== undefined && ev['判定'] !== null) {
    updates.push({ col: 10, value: ev['判定'] });
    updates.push({ col: 11, value: ev['判定'] });
  }
  return updates;
}

if (typeof module !== 'undefined') {
  module.exports = { filterPending: filterPending, findRowByJobId: findRowByJobId, evalToRowUpdates: evalToRowUpdates };
}
