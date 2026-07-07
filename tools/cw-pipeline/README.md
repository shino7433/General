# CW案件パイプライン（GAS収集→スプレッドシート）

CWからのメール（スカウト/おすすめ/保存検索新着）に含まれる案件を、1時間ごとに自動でこのスプレッドシートへ重複なく追記する。

## セットアップ手順

1. Googleドライブで新規スプレッドシートを作成（名前は任意、例「CW案件管理」）。
2. メニュー **拡張機能 → Apps Script** を開く。
3. エディタにコードを貼り付ける。次のどちらでもよい（GASは全 `.gs` がグローバルスコープを共有するため挙動は同一）:
   - **2ファイル構成**（リポジトリと対応）: `parser.gs` ← `parser.js`、`main.gs` ← `main.js`
   - **1ファイル構成**（初期の `コード.gs` に両方を連結して貼り付け）: `parser.js` → 改行 → `main.js` の順。★実運用ではこちらで配置済み
4. 関数 `ensureSheet` を実行 → 権限承認ダイアログで許可（Gmail読み取り・スプレッドシート編集）。
   - `案件管理` シートが作成され、ヘッダーとステータスのプルダウンが入る。
5. 関数 `collectCwJobs` を実行 → 既存のCWメールから案件が追記されることを確認。
6. 関数 `installHourlyTrigger` を実行 → 1時間ごとの自動収集を開始。

## 各列の意味

| 列 | 意味 | 誰が埋める |
|---|---|---|
| A〜J | 案件ID/取得日時/掲載日/タイトル/カテゴリ/予算/報酬形態/URL/ソース種別/ステータス | GAS（カテゴリ・予算・報酬形態は空、後でClaudeが補完） |
| K〜R | 判定/判定理由/提案数/見積/想定実稼働/提案ドラフト/応募日/結果メモ | Claude評価（フェーズ2）・手動 |

## 注意
- CW案件ページのスクレイピングはしない（メール解析のみ）。予算・提案数はフェーズ2でClaudeが案件ページから補完する。
- ステータスは手動またはClaudeが更新（未判定→Go/NoGo→応募済→受注/失注→納品）。

## 運用状況（2026-07-07 稼働開始）
- スプレッドシート「CW案件管理」／Apps Scriptプロジェクト「CW案件パイプライン」に1ファイル構成で配置し、`ensureSheet`→`collectCwJobs`→`installHourlyTrigger` を実行済み。
- 初回収集で既存メールから案件2件（いずれもスカウト）を `未判定` で取得。再実行で「新着CWメールなし」を確認（冪等）。
- 1時間ごとの時間主導トリガーで無人収集を継続中。

## フェーズ2: 評価ループのWeb App（出先ダッシュボード）

評価ループ（[evaluate/RUNBOOK.md](evaluate/RUNBOOK.md)）が使うAPI。GASプロジェクトに `evaluate/api-shape.js`＋`evaluate/estimate.js`＋`api.js` の中身を `コード.gs` に追記して配置する（parser/main と同じ1ファイル構成）。

1. 上記3ファイルの中身を `コード.gs` 末尾に連結して保存。
2. 関数 `initApiToken` を実行 → 実行ログの `CW_API_TOKEN=...` を `tools/cw-pipeline/.secrets/api.env`（gitignore済み）に保存。
3. **デプロイ → 新しいデプロイ → ウェブアプリ**（実行:自分／アクセス:全員）→ ウェブアプリURLを `.secrets/api.env` の `CW_API_URL` に保存。
4. 動作確認: `curl "$CW_API_URL?token=$CW_API_TOKEN&view=pending"` で未判定JSONが返る。
5. 出先確認: スマホで `"$CW_API_URL?view=summary&token=$CW_API_TOKEN"` をブックマーク。

エンドポイント: `GET ?view=pending`（未判定JSON）/ `GET ?view=summary`（HTMLダッシュボード）/ `POST {token,jobId,eval}`（E/F/G・J〜R書き戻し）。

> トークンは秘匿。`.secrets/` はコミットしない。コード改修後は「デプロイを管理→新バージョン」で再デプロイ（URL不変）。**POSTはGASが302リダイレクトするため2段階で叩く**（[RUNBOOK](evaluate/RUNBOOK.md) の `cwpost` 参照）。

## 稼働状況（フェーズ2・2026-07-07）
Web App「評価ループAPI v1」をデプロイ済み。pending取得／forbidden／評価書き戻し／not_found／サマリHTMLをcurl・ブラウザで検証済み。日次の評価ループ起動方式（`/loop`等）は次段で確定。
