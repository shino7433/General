// api.js — GAS Web App: 未判定取得(JSON) / 評価書き戻し(POST) / サマリHTML
// 依存(GASグローバル): SHEET_NAME, HEADERS (main.js), filterPending/findRowByJobId/evalToRowUpdates (api-shape.js)
var API_TOKEN_PROP = 'CW_API_TOKEN';

function initApiToken() {
  var props = PropertiesService.getScriptProperties();
  var t = props.getProperty(API_TOKEN_PROP);
  if (!t) {
    t = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty(API_TOKEN_PROP, t);
  }
  Logger.log('CW_API_TOKEN=' + t);
  return t;
}

function _tokenOk(token) {
  var expected = PropertiesService.getScriptProperties().getProperty(API_TOKEN_PROP) || '';
  return expected !== '' && String(token) === expected;
}

function _sheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function _dataRows(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  e = e || {};
  var p = e.parameter || {};
  if (!_tokenOk(p.token)) return _json({ error: 'forbidden' });
  var sheet = _sheet();
  var rows = _dataRows(sheet);
  var view = p.view || 'pending';
  if (view === 'summary') {
    return HtmlService.createHtmlOutput(buildSummaryHtml(rows)).setTitle('CW案件 評価サマリ');
  }
  return _json(filterPending(rows));
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  if (!_tokenOk(body.token)) return _json({ error: 'forbidden' });
  var sheet = _sheet();
  var rows = _dataRows(sheet);
  var idCol = rows.map(function (r) { return String(r[0]); });
  var idx = findRowByJobId(idCol, String(body.jobId));
  if (idx < 0) return _json({ error: 'not_found', jobId: body.jobId });
  var sheetRow = idx + 2;
  evalToRowUpdates(body.eval || {}).forEach(function (u) {
    sheet.getRange(sheetRow, u.col).setValue(u.value);
  });
  return _json({ ok: true, updatedRow: sheetRow });
}

function _esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildSummaryHtml(rows) {
  var evaluated = (rows || []).filter(function (r) {
    var s = String(r[9] || '');
    return s !== '' && s !== '未判定';
  });
  evaluated.reverse();
  var css = '<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:16px;background:#f6f7f9;color:#1a1a1a}'
    + 'h1{font-size:18px}.card{background:#fff;border-radius:12px;padding:14px;margin:10px 0;box-shadow:0 1px 3px rgba(0,0,0,.08)}'
    + '.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700}'
    + '.b-go{background:#e3f6e9;color:#0a7d32}.b-nogo{background:#fde8ec;color:#b00020}'
    + '.meta{color:#555;font-size:13px;margin:6px 0}.title{font-weight:600;margin:4px 0}'
    + 'a{color:#1558d6}details{margin-top:8px}pre{white-space:pre-wrap;background:#f0f2f5;padding:10px;border-radius:8px;font-size:13px}</style>';
  var items = evaluated.map(function (r) {
    var title = String(r[3] || ''), url = String(r[7] || ''), status = String(r[9] || '');
    var reason = String(r[11] || ''), count = String(r[12] || ''), quote = String(r[13] || '');
    var hours = String(r[14] || ''), draft = String(r[15] || '');
    var isGo = status === 'Go';
    var badge = '<span class="badge ' + (isGo ? 'b-go' : 'b-nogo') + '">' + _esc(status) + '</span>';
    var draftHtml = draft ? '<details><summary>提案ドラフト</summary><pre>' + _esc(draft) + '</pre></details>' : '';
    return '<div class="card">' + badge
      + ' <span class="meta">提案数 ' + _esc(count) + ' / 見積 ' + _esc(quote) + ' / ' + _esc(hours) + '</span>'
      + '<div class="title">' + _esc(title) + '</div>'
      + '<div class="meta">' + _esc(reason) + '</div>'
      + '<div class="meta"><a href="' + _esc(url) + '" target="_blank">案件ページ</a></div>'
      + draftHtml + '</div>';
  }).join('');
  if (!items) items = '<p>評価済みの案件はまだありません。</p>';
  return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'
    + css + '<h1>CW案件 評価サマリ</h1>' + items;
}
