# うめにくBBQ

友達家族（約10家族）で行うBBQ（2026年11月1日開催）の
「参加家族」「役割分担」「会計（立替・精算）」を、みんなで共有して管理する Web アプリです。

- 公開URL：https://umeniku-bbq.web.app
- グループを作って URL を LINE などで送るだけ。会員登録は不要です
- 変更はリアルタイムで全員の画面に反映されます

## できること

| タブ | 内容 |
|---|---|
| ダッシュボード | 人数（区分別・総合計）、担当が未定の項目数、レンタル品の合計と支払った家族、支出の合計とカテゴリ別の円グラフ、集金の進捗 |
| 家族 | 家族ごとの人数（大人／小中学生／幼児／乳児）とメモの登録・編集・削除、全体の集計（精算対象人数つき） |
| 役割分担 | 食材・持ち寄り物品（何を／誰が／どのくらい）、レンタル品（全体で割る／家庭ごと、単価、支払った家族） |
| 会計 | 立て替えた支出の登録・編集・削除、精算（集金額・返金額・余剰金）、集金・返金のチェック、家族ごとの明細 |

精算のルール（重み：大人1・小中学生0.5・幼児0.5・乳児0、集金額は100円単位で切り上げ など）は
[CLAUDE.md](./CLAUDE.md) の「精算のルール」と [docs/plan.md](./docs/plan.md) にまとめています。

## 使っている技術

- Angular 20（standalone components）＋ Angular Material 20
- Firebase：Cloud Firestore、Authentication（匿名認証）、Hosting（すべて無料の Spark プラン）
- AngularFire 20.1.0 ＋ Firebase JS SDK v11（AngularFire 20 が v11 を前提にしているため、v12 にしないこと）
- グラフ：ng2-charts 9 ＋ Chart.js 4
- フォント：Zen Maru Gothic（Google Fonts）

## フォルダの構成

```
src/app/
├── app.config.ts        Firebase の初期化、起動時の匿名サインイン
├── app.routes.ts        画面と URL の対応表
├── constants.ts         精算の重み、カテゴリの表示名などの決まった値
├── models/              Firestore に保存するデータの形（型）
├── core/                サービス（Firestore への読み書き、計算、共通の処理）
│   ├── room.store.ts        開いているグループのデータを全画面で共有する入れ物
│   ├── settlement.service.ts 人数・レンタル・精算の計算（ユニットテストあり）
│   └── ...
├── shared/              画面で使う共通の部品（－／＋ボタン、確認ダイアログ、金額表示など）
└── pages/               画面（トップ、家族の選択、各タブ）
src/styles.scss          色・角丸・フォントのテーマ（CSS変数）。デザインはここだけで管理
firestore.rules          Firestore セキュリティルール
tests/                   セキュリティルールのテスト
docs/plan.md             設計メモ（データ構造、ルール、決めたこと）
```

## 公開のしくみ（GitHub Actions）

プッシュすると、GitHub Actions（`.github/workflows/deploy.yml`）が自動でテストとビルドを行い、
ブランチによって公開先を分けます。テストが1つでも失敗すると公開されません。

| ブランチ | 公開先 |
|---|---|
| `main` | **本番**（https://umeniku-bbq.web.app）とセキュリティルール |
| `claude/vibrant-brahmagupta-mv6ugv`（開発用） | **プレビュー用URL**（`https://umeniku-bbq--dev-○○○.web.app`、30日で期限切れ）。本番とルールは変わらない |

- プレビュー用URLは、GitHub の「Actions」→ 実行結果のページの下（Summary）に表示されます
- プレビューも本番と同じデータベースを使うので、確認はテスト用のグループで行ってください
- 本番に出すときは、開発用ブランチから `main` へのプルリクエストを作って「Merge」します

公開には、GitHub の Secrets に `FIREBASE_SERVICE_ACCOUNT`（サービスアカウントの鍵 JSON）の登録が必要です。
鍵はチャットやコードには絶対に書かないでください。

## 手元で動かす場合（任意）

Node.js 20.19 以上と Git が必要です。

```bash
npm install          # ライブラリのインストール
npm start            # 開発用サーバー → http://localhost:4200
npm test             # ユニットテスト（Chrome が必要）
npm run test:rules   # セキュリティルールのテスト（Java 21 以上が必要）
npm run deploy       # 手元から公開（事前に npx firebase login が必要）
```

※ `npm audit fix --force` は実行しないでください（Angular 20 との組み合わせが壊れます）。

## Firebase の設定（コンソールで済んでいるもの）

- プロジェクトID：`umeniku-bbq`（Spark プラン）
- Authentication：匿名ログインを有効
- Firestore：`asia-northeast1`（東京）、本番環境モードで作成
- セキュリティルール：`firestore.rules`（テストモードは使わない）
  - サインインしていない人は読み書きできない
  - rooms の一覧取得は禁止。roomId を知っている人だけがそのグループを読み書きできる
  - 人数・金額・数量は0以上の整数、文字列は長さを制限
