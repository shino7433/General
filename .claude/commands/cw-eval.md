---
description: CW評価ループを1回実行（未判定案件をChromeで閲覧→Go/No-Go・見積・ドラフト→書き戻し）
---

`tools/cw-pipeline/evaluate/RUNBOOK.md` の手順どおりにCW評価ループを1回だけ実行する。ローカルのログイン済みChrome（claude-in-chrome）が前提。

手順:
1. `cd /Users/shinodzukakazuki/Documents/Claude/general` で作業。`set -a; . tools/cw-pipeline/.secrets/api.env; set +a` で `CW_API_URL`/`CW_API_TOKEN` を読み込み、RUNBOOKの `cwget`/`cwpost` シェル関数を定義する。
2. `cwget` で未判定案件を取得。**0件なら「新着なし」と報告して終了**（何も書き込まない）。
3. 各案件を claude-in-chrome で `url` を開き**閲覧のみ**で評価（[crowdworks.md](../../docs/crowdworks.md) §2/§4/§5/§7 ＋ [freelance.md](../../docs/freelance.md) §4）。見積は `evaluate/estimate.js` のレンジを使う。
4. `cwpost` でE/F/G・J〜（Go時はP）を書き戻す。Go案件のドラフト正本は `docs/proposals/YYYY-MM-DD-<案件>.md` に保存。
5. Go案件があれば `docs/proposals/` を日本語コミット＆push。最後に「Go n件 / No-Go m件」を要約し、確認用ダッシュボードURL（`$CW_API_URL?view=summary&token=$CW_API_TOKEN`）を案内する。

**厳守**: CW上で応募・送信・メッセージを一切しない（送信は必ず人間）。書き込み先は自分のシート/リポジトリのみ。
