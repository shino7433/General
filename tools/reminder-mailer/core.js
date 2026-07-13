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

function renderTemplate(text, vars) {
  vars = vars || {};
  return String(text == null ? '' : text).replace(/\{([^{}]+)\}/g, function (m, key) {
    return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : m;
  });
}

function parseSentState(cell) {
  return String(cell == null ? '' : cell)
    .split(/[,\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
}
function markSentState(cell, label) {
  var arr = parseSentState(cell);
  if (arr.indexOf(String(label)) === -1) arr.push(String(label));
  return arr.join(' ');
}

if (typeof module !== 'undefined') {
  module.exports = { parseOffsets: parseOffsets, daysUntilDue: daysUntilDue, renderTemplate: renderTemplate, parseSentState: parseSentState, markSentState: markSentState };
}
