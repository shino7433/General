function parseOffsets(str) {
  return String(str == null ? '' : str)
    .split(/[,\s]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return /^\d+$/.test(s); })
    .map(Number);
}

function daysUntilDue(today, dueDate) {
  var MS = 86400000;
  var a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  var b = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.round((b - a) / MS);
}

if (typeof module !== 'undefined') {
  module.exports = { parseOffsets: parseOffsets, daysUntilDue: daysUntilDue };
}
