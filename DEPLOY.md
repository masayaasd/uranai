# 診断ページ公開手順

## 目的

この診断ページをCloudflare Pagesで公開し、診断完了時にLハーネスへタグが付く状態にします。

## 先に決めるもの

- Cloudflare Pages のプロジェクト名  
  例: `ryujin-diagnosis`
- 診断ページの公開URL  
  例: `https://ryujin-diagnosis.pages.dev`

## Cloudflare Pages の設定

Cloudflare Pagesで新規プロジェクトを作成し、以下で設定します。

```text
Framework preset: None
Build command: npm run build
Build output directory: dist
Root directory: /
```

`functions/api/diagnosis-tags.js` を使うため、公開方法は以下のどちらかにしてください。

- Git連携でCloudflare Pagesに接続する
- Wranglerで `npm run deploy` を実行する

Cloudflare管理画面のドラッグ&ドロップだけだと、Pages Functionsが反映されない場合があります。

## 環境変数

Cloudflare Pages の環境変数に以下を登録します。

```text
LINE_HARNESS_API_URL=https://line-harness.takumi-baseball04010.workers.dev
LINE_LOGIN_CHANNEL_ID=2010382261
LINE_HARNESS_API_KEY=<受け取ったLハーネスAPIキー>
ALLOWED_ORIGINS=<診断ページの公開URL>
```

例:

```text
ALLOWED_ORIGINS=https://ryujin-diagnosis.pages.dev
```

`LINE_HARNESS_API_KEY` は公開ページに入れません。Cloudflareの環境変数だけに入れます。

## LINEで配信するURL

リッチメニューや配信メッセージには、LハーネスのLIFF URLに診断ページへの `redirect` を付けたURLを使います。

```text
https://liff.line.me/2010382261-EjL1dqOH?liffId=2010382261-EjL1dqOH&ref=ryujin_diagnosis&redirect=https%3A%2F%2Furanai-5ua.pages.dev%2Ft%2F%3Futm_source%3Dline%26entry%3Drich_menu
```

配信別に見分けたい場合は `entry` だけ変えてください。

```text
https://liff.line.me/2010382261-EjL1dqOH?liffId=2010382261-EjL1dqOH&ref=ryujin_diagnosis&redirect=https%3A%2F%2Furanai-5ua.pages.dev%2Ft%2F%3Futm_source%3Dline%26entry%3Dbroadcast
```

## LINEの外部サイト警告について

LハーネスのLIFFエンドポイントから `uranai-5ua.pages.dev` へ移動する構成では、LINEアプリが「外部サイトに移動したため...」という警告を表示する場合があります。

この警告を避けるには、LINE Developers Console のLIFF設定で、LIFFの Endpoint URL を診断ページ側のURLに変更してください。

```text
Endpoint URL: https://uranai-5ua.pages.dev/
```

この設定変更はLハーネス管理画面ではなく、LINE Developers Console側で行います。

## 公開後の確認

1. 公開URLをスマホで開いてトップページが表示されるか確認します。
2. LINE配信用URLから診断ページを開きます。
3. LハーネスのLIFF確認後、診断ページへ戻ることを確認します。
4. 診断を最後まで回答します。
5. Lハーネス管理画面で該当ユーザーにタグが付いているか確認します。

付く想定のタグ例:

```text
診断_完了
白龍タイプ / 緑龍タイプ / 月龍タイプ / 金龍タイプ
40代
東京都
老後資金
内容次第で相談したい
ミニ鑑定_希望
```

## うまくタグが付かない時

- 配信URLが `https://liff.line.me/2010382261-EjL1dqOH?...&redirect=...` の形式になっているか確認します。
- 診断ページに戻ったURLに `lu=` が付いているか確認します。
- `LINE_HARNESS_API_KEY` がCloudflare Pagesに登録されているか確認します。
- `ALLOWED_ORIGINS` が実際の公開URLと一致しているか確認します。
- Lハーネス側に友だち登録済みのユーザーでテストしているか確認します。
