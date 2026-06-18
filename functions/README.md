# Cloudflare Pages Functions

診断結果をLハーネスへタグ連携する中継APIです。

## エンドポイント

```text
POST /api/diagnosis-tags
```

診断ページの `app.js` は、このエンドポイントへLIFFの `idToken`、またはLハーネスLIFF導線から戻った `lu` と診断結果を送信します。

## 環境変数

Cloudflare Pages の環境変数に設定してください。

```text
LINE_HARNESS_API_URL=https://line-harness.takumi-baseball04010.workers.dev
LINE_LOGIN_CHANNEL_ID=2010382261
LINE_HARNESS_API_KEY=<LハーネスAPIキー>
ALLOWED_ORIGINS=https://your-diagnosis-domain.example
```

`LINE_HARNESS_API_KEY` はブラウザに見せないため、必ずサーバー側の環境変数として設定します。

## 処理内容

1. LINEの `idToken` を検証、またはLハーネスから戻ったLINEユーザーIDを受け取る
2. Lハーネスの友だちIDを解決
3. 診断結果タグを作成または取得
4. 友だちへタグ付け
5. 診断結果を友だちメタデータへ保存

## 注意

リッチメニューと配信URLは、LハーネスのLIFF URLに診断ページへの `redirect` を付けた形式にしてください。診断ページを直接配信すると、LINEユーザーを特定できずタグ送信できない場合があります。
