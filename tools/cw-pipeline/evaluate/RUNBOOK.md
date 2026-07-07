# CW評価ループ RUNBOOK（Claude日次手順）

ローカルセッションで、稼働中の「案件管理」シートの未判定案件を評価し書き戻す。**送信は絶対にしない。** 詳細な設計は [評価ループ設計書](../../../docs/superpowers/specs/2026-07-07-cw-評価ループ-design.md)。

## 前提
- ローカル実行（crowdworks.jp はクラウド遮断）。Chromeが CW/Google にログイン済み。
- APIの認証情報を読み込む: `set -a; . tools/cw-pipeline/.secrets/api.env; set +a`（`CW_API_URL` / `CW_API_TOKEN` が入る。`.secrets/` は gitignore 済み）。
- 現在の受注評価数は **0件**（Phase 0）。見積のステージ判定に使う（`estimate` の `evalCount`）。受注が増えたらこの値を更新。

## APIの叩き方（重要）
GETはそのまま。**POSTはGASが302リダイレクトするため2段階**（`curl -L` の再POSTはDriveエラーになる）。セッション冒頭で次のシェル関数を定義して使う:

```bash
set -a; . tools/cw-pipeline/.secrets/api.env; set +a

# 未判定取得
cwget() { curl -s -L "$CW_API_URL?token=$CW_API_TOKEN&view=pending"; }

# 評価書き戻し（302のlocationを拾ってGETで本文を読む）
cwpost() {
  local loc
  loc=$(curl -s -o /dev/null -w '%{redirect_url}' -X POST "$CW_API_URL" \
        -H 'Content-Type: application/json' --data "$1")
  curl -s "$loc"
}
```
- 成功は `{"ok":true,"updatedRow":N}`。`{"error":"forbidden"}`＝トークン不一致、`{"error":"not_found","jobId":".."}`＝案件ID不在。

## 手順
1. **未判定取得**: `cwget` → 案件配列 `[{jobId,url,title,sourceType,row}]`。0件なら終了。
2. 各案件について（案件間に数秒空ける・多重アクセスしない）:
   1. claude-in-chrome で `url` を**閲覧のみ**で開く。取得: 提案数 / クライアント評価・発注履歴 / 予算 / 報酬形態 / カテゴリ / 要件全文 / 「継続・長期」有無 / 悪質シグナル。
   2. **Go/No-Go**（[crowdworks.md](../../../docs/crowdworks.md) §2/§4/§7）:
      - No-Go: 提案数30件超 / 時間単価制・コンペ / 月数十時間の常駐（週10h制約違反）/ 未経験優先・カンタン作業・情報商材シグナル(§7) / 直接取引誘導 / クライアント評価4.5未満・仮払いを渋る。
      - Go: 固定報酬・提案数少なめ（理想5件未満）・要件具体・定番4型/AI系に合致。
   3. **見積・想定実稼働**: 案件規模を small/medium/large で見立て、`estimate({evalCount:0, size})`（[estimate.js](estimate.js)）の返り値（`見積`/`想定実稼働`）を使う。
   4. **Go案件のみ提案ドラフト**: 型A（要件明確）/型B（曖昧＝選択肢提示で質問終わり）を [crowdworks.md](../../../docs/crowdworks.md) §4 ＋ [freelance.md](../../../docs/freelance.md) §5 で作成。型Cデモは対象外。
3. **書き戻し**（案件ごとに `cwpost`）。`eval` は提供したキーだけ書かれる:
   ```bash
   cwpost '{"token":"'"$CW_API_TOKEN"'","jobId":"<ID>","eval":{
     "カテゴリ":"…","予算":"…","報酬形態":"…",
     "判定":"Go",            // "Go" | "NoGo"（Jステータス＝K判定 の両方に入る）
     "判定理由":"…","提案数":N,"見積":"…","想定実稼働":"…",
     "提案ドラフト":"…（Go時のみ本文）"
   }}'
   ```
4. **Go案件のドラフト正本**を `docs/proposals/YYYY-MM-DD-<案件>.md`（[_template.md](../../../docs/proposals/_template.md)）に保存。
5. 全案件処理後、`docs/proposals/` と進捗をまとめて日本語コミット＆push。**送信は人間がダッシュボード/シートを見て判断**。

## エラー処理
- 案件が404/募集終了: `cwpost '{"token":..,"jobId":"<ID>","eval":{"判定":"クローズ","結果メモ":"案件削除/募集終了"}}'`（Jが変わり再処理されない。プルダウンに `クローズ` あり）。
- ページ解析に失敗: 判定を送らず `eval:{"結果メモ":"解析失敗: <理由>"}` のみ（Jは未判定のまま→次回再試行）。
- `{"error":"forbidden"}`＝トークン不一致→中断して要確認。

## ガードレール
- CW上の応募・送信・メッセージを**一切しない**。書き込み先は自分のシート/リポジトリのみ。
- 人間ペース。1日の未判定は通常一桁。
- 出先確認用ダッシュボード（スマホでブックマーク）: `"$CW_API_URL?view=summary&token=$CW_API_TOKEN"`。
