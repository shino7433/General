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

function buildSlackPayload(message) {
  return { text: String(message) };
}
function buildLinePayload(message, userId) {
  return { to: String(userId), messages: [{ type: 'text', text: String(message) }] };
}

function selectDue(rows, today, config) {
  config = config || {};
  var offsets = config.offsets || [];
  var out = [];
  (rows || []).forEach(function (r) {
    if (!r || r.enabled === false) return;
    if (!(r.dueDate instanceof Date) || isNaN(r.dueDate.getTime())) return;
    var d = daysUntilDue(today, r.dueDate);
    var sent = parseSentState(r.sentState);
    var label = null;
    if (d >= 0) {
      if (offsets.indexOf(d) !== -1) label = (d === 0 ? '0' : '-' + d);
    } else if (config.overdueAlert) {
      label = '超過';
    }
    if (label && sent.indexOf(label) === -1) {
      out.push({ index: r.index, subject: r.subject, body: r.body, offsetLabel: label, daysUntilDue: d, dueDate: r.dueDate });
    }
  });
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = { parseOffsets: parseOffsets, daysUntilDue: daysUntilDue, renderTemplate: renderTemplate, parseSentState: parseSentState, markSentState: markSentState, buildSlackPayload: buildSlackPayload, buildLinePayload: buildLinePayload, selectDue: selectDue };
}
