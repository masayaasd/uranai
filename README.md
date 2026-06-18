# 龍神金運タイプ診断 MVP

スマホ特化型の占い診断ファネル初期版です。静的ファイルだけで動作します。

## 実装内容

- スマホ向けLP
- 診断前同意
- 基本情報入力
- マーケティング用セグメント入力
- 30問の1問1画面診断
- 診断後の任意自由記入欄
- 4軸スコアリング
- 白龍・緑龍・月龍・金龍タイプ判定
- サブタイプ表示
- 4タイプ別の結果ビジュアル表示
- 分析中演出
- LINE登録CTA
- localStorage保存
- プライバシーポリシー、利用規約、特商法表記

## 開き方

`index.html` をブラウザで開くだけで動作します。

## 公開方法

Cloudflare Pagesで公開する前提の設定を追加済みです。

```text
Build command: npm run build
Build output directory: dist
```

詳しい手順は `DEPLOY.md` を確認してください。

## LINE/LIFF連携の差し替え

Lハーネス管理画面から確認した本番値を `app.js` に設定済みです。

```js
const CONFIG = {
  lineUrl: "https://line-harness.takumi-baseball04010.workers.dev/auth/line",
  lineRef: "ryujin_diagnosis",
  storageKey: "ryujin_diagnoses_v1",
  lineHarness: {
    enabled: true,
    endpoint: "/api/diagnosis-tags",
    liffId: "2010382261-EjL1dqOH",
    userIdParams: ["line_user_id", "lh_uid", "lhUserId", "uid", "userId"],
    entryParams: ["entry", "lh_entry", "route", "utm_content"]
  }
};
```

## Lハーネスタグ連携

診断完了時とLINE CTAクリック時に、診断結果から作ったタグをLハーネスへPOSTできます。
公開フロントにLハーネスのAPIキーは置きません。診断ページはLIFF SDKから取得した `idToken` と診断結果だけを `/api/diagnosis-tags` へ送ります。

中継APIは Cloudflare Pages Functions として `functions/api/diagnosis-tags.js` に実装済みです。

中継APIの処理:

- LINEの `idToken` を `LINE_LOGIN_CHANNEL_ID` で検証
- LハーネスAPIの `/api/liff/profile` で友だちIDを解決
- `/api/tags` でタグを作成または取得
- `/api/friends/:id/tags` で友だちへタグ付け
- `/api/friends/:id/metadata` で診断結果をメタデータ保存

Cloudflare Pages の環境変数:

```text
LINE_HARNESS_API_URL=https://line-harness.takumi-baseball04010.workers.dev
LINE_LOGIN_CHANNEL_ID=2010382261
LINE_HARNESS_API_KEY=<管理画面ログインに使うAPIキー>
ALLOWED_ORIGINS=https://your-diagnosis-domain.example
```

`LINE_HARNESS_API_KEY` は必ずCloudflareの環境変数またはSecretとして設定してください。`app.js`、HTML、READMEへ実キーを書かないでください。

リッチメニューと配信URLは、診断ページの直リンクではなく、Lハーネスの `auth/line` URLに診断ページURLを `redirect` で付けたものを使ってください。

形式:

```text
https://line-harness.takumi-baseball04010.workers.dev/auth/line?ref=ryujin_diagnosis&redirect=<診断ページURLをURLエンコードしたもの>
```

Lハーネス側に登録済みのLIFF IDは以下です。

```text
2010382261-EjL1dqOH
```

Lハーネス管理画面内で「LIFF設定」を探す必要はありません。

送信イベント:

- `diagnosis_completed`: 診断完了時
- `line_cta_clicked`: 結果画面のLINE CTAクリック時

送信する主な情報:

- `idToken`
- `entry`
- `diagnosisId`
- `tags`
- `mainTypeName`
- `subLabel`
- `scores`
- 基本情報、現在の悩み、興味テーマ、購買温度
- `utm_source` などの流入元情報

## 本番化で必要な追加実装

- APIとDB保存
- 診断結果の再表示URL
- LINEステップ配信連携
- 管理画面ログイン
- 特商法表記の事業者情報差し替え
- プライバシーポリシーの正式版確認
