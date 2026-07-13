var DATA_SHEET = 'リマインド一覧';
var CONFIG_SHEET = '設定';
var LOG_SHEET = '送信ログ';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('リマインダー')
    .addItem('初回セットアップ', 'firstRunSetup')
    .addItem('テスト送信', 'sendTestNotification')
    .addItem('今すぐ実行', 'onTimeTrigger')
    .addToUi();
}

function firstRunSetup() {
  setup();
  installDailyTrigger();
  try {
    var res = sendTestNotification();
    SpreadsheetApp.getUi().alert('初回セットアップ完了: ' + res);
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'シートを準備しました。「設定」シートに通知先（Slack Webhook URL、またはLINEトークン＋userId）を入力してから、メニュー→テスト送信 を押してください。\n' + e.message
    );
  }
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, DATA_SHEET, ['期限日', '件名', '本文', '有効', '送信状態', '最終送信日時', 'メモ']);
  ensureSheet(ss, LOG_SHEET, ['日時', '対象行', 'オフセット', '通知先', '結果']);
  var cfg = ss.getSheetByName(CONFIG_SHEET);
  if (!cfg) {
    cfg = ss.insertSheet(CONFIG_SHEET);
    var rows = [
      ['項目', '値'],
      ['通知先(slack/line)', 'slack'],
      ['Slack Webhook URL', ''],
      ['LINEアクセストークン', ''],
      ['LINE userId(カンマ区切り)', ''],
      ['送信オフセット', '7,1,0'],
      ['超過アラート(ON/OFF)', 'ON'],
      ['1回の送信上限', '50'],
      ['実行時刻(0-23)', '8'],
      ['差出人名', ''],
    ];
    cfg.getRange(1, 1, rows.length, 2).setValues(rows);
  }
  applyValidations_(ss);
  ensureSampleRow_(ss);
}

function applyValidations_(ss) {
  var dataSh = ss.getSheetByName(DATA_SHEET);
  var lastRow = Math.max(dataSh.getMaxRows(), 2);
  var checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  dataSh.getRange(2, 4, lastRow - 1, 1).setDataValidation(checkboxRule);

  var cfgSh = ss.getSheetByName(CONFIG_SHEET);
  var channelRow = findConfigRow_(cfgSh, '通知先(slack/line)');
  if (channelRow) {
    var channelRule = SpreadsheetApp.newDataValidation().requireValueInList(['slack', 'line']).build();
    cfgSh.getRange(channelRow, 2).setDataValidation(channelRule);
  }
}

function findConfigRow_(cfgSh, label) {
  var last = cfgSh.getLastRow();
  if (last < 2) return null;
  var vals = cfgSh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === label) return i + 2;
  }
  return null;
}

function ensureSampleRow_(ss) {
  var dataSh = ss.getSheetByName(DATA_SHEET);
  if (dataSh.getLastRow() >= 2) return;
  var today = new Date();
  dataSh.getRange(2, 1, 1, 7).setValues([[
    today, '（例）請求書送付', '{件名} の期限は {期限日}（残り{残り日数}日）です', true, '', '', '記入例。不要なら削除してください',
  ]]);
}

function ensureSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readConfig() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  var map = {};
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  v.forEach(function (r) { map[String(r[0]).trim()] = String(r[1]).trim(); });
  return {
    channel: (map['通知先(slack/line)'] || 'slack').toLowerCase(),
    slackWebhookUrl: map['Slack Webhook URL'] || '',
    lineToken: map['LINEアクセストークン'] || '',
    lineUserIds: (map['LINE userId(カンマ区切り)'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
    offsets: parseOffsets(map['送信オフセット'] || '7,1,0'),
    overdueAlert: /^on$/i.test(map['超過アラート(ON/OFF)'] || 'ON'),
    sendCap: Number(map['1回の送信上限'] || '50'),
    runHour: normalizeRunHour_(map['実行時刻(0-23)']),
    senderName: map['差出人名'] || '',
  };
}

function normalizeRunHour_(raw) {
  var n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 23) return 8;
  return n;
}

function readRows() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, 7).getValues();
  return vals.map(function (r, i) {
    return {
      index: i + 2, dueDate: r[0], subject: r[1], body: r[2],
      enabled: r[3] === true || String(r[3]).toUpperCase() === 'TRUE',
      sentState: r[4],
    };
  });
}

function onTimeTrigger() {
  var config = readConfig();
  var due = selectDue(readRows(), new Date(), config);
  var sent = 0;
  for (var i = 0; i < due.length && sent < config.sendCap; i++) {
    var item = due[i];
    var vars = {
      '件名': item.subject, '期限日': formatDate_(item.dueDate),
      '残り日数': item.daysUntilDue,
    };
    var msg = (config.senderName ? '[' + config.senderName + '] ' : '') +
      renderTemplate(String(item.body || item.subject), vars);
    try {
      notify(config, msg);
      writeBackSent_(item, config.channel);
      sent++;
    } catch (e) {
      logRow_([new Date(), item.index, item.offsetLabel, config.channel, 'ERROR: ' + e.message]);
    }
  }
  return sent + '件送信';
}

function notify(config, message) {
  if (config.channel === 'slack') return sendViaSlack(config, message);
  if (config.channel === 'line') return sendViaLine(config, message);
  throw new Error('通知先(slack/line)が未設定または不正です: "' + config.channel + '"');
}

function sendViaSlack(config, message) {
  if (!config.slackWebhookUrl) throw new Error('Slack Webhook URLが未設定です');
  UrlFetchApp.fetch(config.slackWebhookUrl, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(buildSlackPayload(message)),
  });
}

function sendViaLine(config, message) {
  if (!config.lineToken) throw new Error('LINEアクセストークンが未設定です');
  if (!config.lineUserIds.length) throw new Error('LINE userIdが未設定です');
  config.lineUserIds.forEach(function (uid) {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + config.lineToken },
      payload: JSON.stringify(buildLinePayload(message, uid)),
    });
  });
}

function writeBackSent_(item, channel) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  var cur = sh.getRange(item.index, 5).getValue();
  sh.getRange(item.index, 5).setValue(markSentState(cur, item.offsetLabel));
  sh.getRange(item.index, 6).setValue(formatDate_(new Date(), true));
  logRow_([new Date(), item.index, item.offsetLabel, channel, 'OK']);
}

function logRow_(row) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOG_SHEET).appendRow(row);
}

function formatDate_(d, withTime) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  var tz = Session.getScriptTimeZone();
  return Utilities.formatDate(d, tz, withTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onTimeTrigger') ScriptApp.deleteTrigger(t);
  });
  var config = readConfig();
  ScriptApp.newTrigger('onTimeTrigger').timeBased().everyDays(1).atHour(config.runHour).create();
}

function sendTestNotification() {
  var config = readConfig();
  var msg = (config.senderName ? '[' + config.senderName + '] ' : '') +
    'これはテスト通知です（スプシ期限リマインダー）。届いていれば設定OKです。';
  notify(config, msg);
  return '通知先=' + config.channel + ' にテスト送信しました';
}
