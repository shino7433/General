# 売掛×買掛 期日ダブルアラート（GASテンプレ）

個人事業主・小規模事業者向け。売掛（もらう側）と買掛（払う側）の期日を1枚のスプレッドシートで管理し、**LINE / Slack** に能動プッシュ通知するGoogle Apps Scriptテンプレ。BOOTH 2本目製品。

- **買掛**：支払期日の N日前に「支払予告」を自分へ通知（払い忘れ防止）
- **売掛**：入金予定日を過ぎて未入金なら「督促」を自分へ通知（取りっぱぐれ防止）
- **済**チェックで以後停止、同一通知は重複送信しない

## 差別化（BOOTH競合調査済み）
- 「買掛の期日前通知」はBOOTHに存在しない空白
- 既存の入金管理はNotion/Excelの受動フラグ止まり → 本製品は能動プッシュ
- 売掛×買掛を1枚で両面管理する商品が無い

詳細設計: [../../docs/superpowers/specs/2026-07-13-dual-due-alert-design.md](../../docs/superpowers/specs/2026-07-13-dual-due-alert-design.md)

## 構成
| ファイル | 責務 |
|---|---|
| `core.js` | 純粋ロジック（`selectDue`＝種別別の期日判定、`buildMessage`、テンプレ描画、送信状態管理、通知ペイロード生成）。GAS非依存でNodeテスト可能 |
| `main.js` | GASグルー（シート生成・設定読取・日次トリガー・Slack/LINE送信・書き戻し・ログ） |
| `core.test.js` | `core.js` の単体テスト |

`core.js` は1本目 reminder-mailer の資産を流用・拡張（種別＝売掛/買掛への対応を追加）。

## テスト
```bash
cd tools/dual-due-alert
node --test          # core.js の単体テスト（12件）
node --check main.js # GAS依存部の構文チェック
```
GAS依存部（SpreadsheetApp/UrlFetchApp等）はスプレッドシート上で「テスト送信」メニューから手動確認する。

## 購入者への配布
`手順書.md` を参照。テンプレのコピーURL（`.../copy`、共有=リンクを知る全員/閲覧）で配布し、購入者はコピーして設定シートに通知先を入れるだけ。
