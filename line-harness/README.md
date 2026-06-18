# LハーネスOSS 本体改造案

このディレクトリは、LハーネスOSS本体を編集できる場合の予備案です。

今回の実運用ではAPIキーが利用できるため、まずは本体改造ではなく `functions/api/diagnosis-tags.js` の中継API方式を使ってください。

## できること

- LIFFの `idToken` をLINE APIで検証
- 検証済みのLINE userIdからLハーネスの友だちを検索
- 診断結果タグを自動作成して友だちへ付与
- `tag_added` シナリオを起動
- 診断結果、流入元、自由記入欄などを友だちメタデータへ保存

## 導入手順

1. `diagnosis-tags.ts` をLハーネスOSSの `apps/worker/src/routes/diagnosis-tags.ts` へコピーします。
2. LハーネスOSSの `apps/worker/src/index.ts` に追加します。

```ts
import { diagnosisTags } from './routes/diagnosis-tags.js';

app.route('/', diagnosisTags);
```

3. LハーネスWorkerをデプロイします。
4. 診断ページの `app.js` で `CONFIG.lineHarness` を設定します。

```js
lineHarness: {
  enabled: true,
  endpoint: "https://line-harness.takumi-baseball04010.workers.dev/api/liff/diagnosis-tags",
  liffId: "2010382261-EjL1dqOH",
  userIdParams: ["line_user_id", "lh_uid", "lhUserId", "uid", "userId"],
  entryParams: ["entry", "lh_entry", "route", "utm_content"]
}
```

## 配信方法

リッチメニューと配信URLは、通常URLではなくLIFF URLにしてください。

```text
https://liff.line.me/2010382261-EjL1dqOH?utm_source=line&entry=rich_menu
https://liff.line.me/2010382261-EjL1dqOH?utm_source=line&entry=broadcast
```

LIFF URLで開くことで、診断ページ側がLINEの `idToken` を取得できます。Worker側はこの `idToken` を検証してからタグ付けするため、フロントへLハーネスのAPIキーを置く必要はありません。

## CORS

診断ページをLハーネスWorkerと別ドメインで配信する場合は、Lハーネス側で診断ページのオリジンをCORS許可してください。迷う場合は、診断ページも同一オリジンで配信する構成が最も単純です。

## 注意

Lハーネスに友だちが未登録の場合、`Friend not found` になります。先にLハーネス側で友だち登録、またはトラッキングリンクやLIFF連携で友だちが作成される導線を用意してください。
