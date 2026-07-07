var SHEET_NAME = '案件管理';
var HEADERS = ['案件ID','取得日時','掲載日','タイトル','カテゴリ','予算','報酬形態','URL','ソース種別','ステータス','判定','判定理由','提案数','見積','想定実稼働','提案ドラフト','応募日','結果メモ'];
var STATUS_OPTIONS = ['未判定','Go','NoGo','応募済','受注','失注','納品','クローズ'];
var STATUS_COL = 10; // 列J

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
