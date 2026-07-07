var SHEET_NAME = '案件管理';
var HEADERS = ['案件ID','取得日時','掲載日','タイトル','カテゴリ','予算','報酬形態','URL','ソース種別','ステータス','判定','判定理由','提案数','見積','想定実稼働','提案ドラフト','応募日','結果メモ'];
var STATUS_OPTIONS = ['未判定','Go','NoGo','応募済','受注','失注','納品','クローズ'];
var STATUS_COL = 10; // 列J
var PROP_LAST_EPOCH = 'CW_PIPELINE_LAST_EPOCH';
var GMAIL_QUERY = 'from:no-reply@crowdworks.jp newer_than:2d';

function ensureSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS_OPTIONS, true).build();
    sheet.getRange(2, STATUS_COL, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  }
  return sheet;
}

function getExistingIds(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, 1).getValues();
  return values.map(function (r) { return String(r[0]); });
}

function collectCwJobs() {
  var sheet = ensureSheet();
  var props = PropertiesService.getScriptProperties();
  var lastEpoch = Number(props.getProperty(PROP_LAST_EPOCH) || 0);
  var threads = GmailApp.search(GMAIL_QUERY, 0, 50);
  var messages = [];
  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) { messages.push(m); });
  });
  // チェックポイントより新しいメールのみ、古い順に処理
  messages = messages
    .filter(function (m) { return m.getDate().getTime() > lastEpoch; })
    .sort(function (a, b) { return a.getDate().getTime() - b.getDate().getTime(); });

  if (messages.length === 0) { Logger.log('新着CWメールなし'); return; }

  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  var maxEpoch = lastEpoch;
  var appended = 0;
  messages.forEach(function (m) {
    var email = { subject: m.getSubject(), body: m.getPlainBody() };
    var records = parseEmail(email);
    var existing = getExistingIds(sheet);
    var rows = computeNewRows(records, existing, now);
    rows.forEach(function (row) { sheet.appendRow(row); appended++; });
    var e = m.getDate().getTime();
    if (e > maxEpoch) maxEpoch = e;
  });
  props.setProperty(PROP_LAST_EPOCH, String(maxEpoch));
  Logger.log('追記件数: ' + appended);
}

function installHourlyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'collectCwJobs') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('collectCwJobs').timeBased().everyHours(1).create();
  Logger.log('1時間ごとのトリガーを設置しました');
}
