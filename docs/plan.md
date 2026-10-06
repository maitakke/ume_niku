# 全体計画（確定版）

CLAUDE.md を補足する設計メモ。2026-10-06 に合意した内容。

## 1. Firestore のデータ構造

### rooms/{roomId}
| フィールド | 型 | 説明 |
|---|---|---|
| name | string（1〜50文字） | グループ名 |
| rentalPayerFamilyId | string \| null | レンタル代を支払った家族。未定なら null |
| createdAt | Timestamp | 作成日時（サーバー時刻） |

### rooms/{roomId}/families/{familyId}
| フィールド | 型 | 説明 |
|---|---|---|
| name | string（1〜30文字） | 家族名 |
| adults / students / preschoolers / infants | number（0〜99の整数） | 大人／小中学生／幼児／乳児 |
| memo | string（0〜200文字） | メモ |
| collectionCheck | CheckRecord \| null | 集金チェック。null＝未チェック |
| refundCheck | CheckRecord \| null | 返金チェック。null＝未チェック |
| createdAt | Timestamp | 並び順用 |

CheckRecord = `{ amount: number, checkedByFamilyId: string, checkedAt: Timestamp }`
チェックを外したら null に戻す（記録も消える）。

### rooms/{roomId}/items/{itemId}
| フィールド | 型 | 使うカテゴリ |
|---|---|---|
| category | 'food' \| 'bring' \| 'rental' | 共通 |
| name | string（1〜50文字） | 共通 |
| createdAt | Timestamp | 共通 |
| assigneeFamilyId | string \| null | 食材・持ち寄り（null＝未定） |
| quantityText | string（0〜30文字） | 食材・持ち寄り |
| splitType | 'shared' \| 'perFamily' | レンタル（**作成後は変更不可**） |
| unitPrice | number（0以上の整数） | レンタル |
| quantity | number（0以上の整数） | レンタル・全体で割る |
| quantities | { [familyId]: number } | レンタル・家庭ごと |

### rooms/{roomId}/expenses/{expenseId}
| フィールド | 型 | 説明 |
|---|---|---|
| payerFamilyId | string | 立て替えた家族 |
| amount | number（1〜1,000,000の整数） | 金額 |
| category | 'food' \| 'drink' \| 'equipment' \| 'venue' \| 'other' | 食材／飲み物／備品／会場／その他 |
| description | string（0〜50文字） | 内容 |
| createdByFamilyId | string | 登録した家族（編集時も変えない） |
| createdAt | Timestamp | 登録日時（編集時も変えない） |

支出は **登録・編集・削除** ができる。

## 2. セキュリティルールの方針
- すべて `request.auth != null`（匿名認証済み）が前提
- rooms：get のみ許可、list は禁止。作成・更新は許可、削除は禁止
- 配下（families / items / expenses）：親ルームが存在すれば読み書き可
- collectionGroup などそれ以外はすべて拒否
- 書き込み時は keys().hasOnly / 型（is int, is string）/ 範囲 / 文字数をチェック
- createdAt・checkedAt は request.time と一致すること
- roomId は英数字20文字以上
- quantities の更新は「変わったキーが1つだけ」＋マップ件数の上限
- 最初は「全部拒否」ルールから始め、テストモードは使わない

## 3. 画面とルーティング
| URL | 画面 |
|---|---|
| / | トップ（グループ作成） |
| /r/:roomId/created | 作成完了（共有URL・コピー） |
| /r/:roomId/select-family | 家族の選択・追加 |
| /r/:roomId | → dashboard へ転送 |
| /r/:roomId/dashboard | ダッシュボード |
| /r/:roomId/families | 家族 |
| /r/:roomId/roles | 役割分担 |
| /r/:roomId/accounting | 会計 |
| ** | 見つからない |

- タブ4つは共通の外枠（ヘッダー：グループ名／参加中の家族と「変更」／URLコピー、下部タブバー）の中
- 家族未選択ならガードで select-family へ
- Hosting は全URLを index.html にリライト

## 4. サービス
| サービス | 役割 |
|---|---|
| AuthService | 起動時に匿名サインイン。完了まで Firestore に触らせない |
| RoomService | ルームの作成・購読・レンタル支払者の更新 |
| FamilyService | 家族の CRUD・購読、集金／返金チェック |
| ItemService | 役割分担の CRUD・購読、家庭ごと数量の更新 |
| ExpenseService | 支出の追加・編集・削除・購読 |
| RoomStore | 開いているルームのデータを Signal で保持し4タブで共有。精算結果も computed で持つ |
| CurrentFamilyService | 端末に記憶した家族の読み書き |
| SettlementService | 精算・人数集計の計算のみ（Firestore 非依存、ユニットテスト対象） |
| ShareService | 共有URL生成・コピー・「コピーしました」表示 |
| ConfirmDialogService | 削除・チェック解除の確認ダイアログ |
| constants.ts | 精算の重み、カテゴリ表示名 |

## 5. 家族の記憶
- localStorage キー `bbq-family:<roomId>` に familyId を保存
- 保存された familyId が一覧にない場合は未選択扱い
- ヘッダーの「変更」から選び直し

## 6. 家庭ごと数量の同時入力
- `updateDoc(ref, { 'quantities.<familyId>': n })` で自分のキーだけ更新（マップ全体は書かない）
- 値は画面上の最新値 ±1 の絶対値（0未満にしない）
- **＋／－ボタンは自分の家族の行だけ押せる**。他の家族の行は表示のみ

## 7. 精算の計算
- 重みは2倍の整数（大人2・小中1・幼児1・乳児0）で計算し、割り算は最後に1回、100円単位で切り上げ
- 集金額 = ceil((共通費 × 家族の重み2倍 + 家庭ごとレンタル × 重み2倍合計) / (重み2倍合計 × 100)) × 100
- レンタル支払者が未定なら、レンタル品（全体・家庭ごと両方）を除外して警告
- 重み合計が0なら計算しない
- 検算例（3家族）：集金 8,300 / 9,400 / 6,600、返金 12,480 / 5,770 / 6,000、余剰金 50円

## 8. 家族の削除（Step 3 で確定）
| その家族の状態 | 扱い |
|---|---|
| 立て替えた支出がある | 削除できない（理由を表示） |
| レンタル代を支払った家族になっている | 削除できない |
| 「家庭ごと」レンタル品の数量が1以上 | 削除できない（0にしてから） |
| 食材・持ち寄りの担当になっている | 確認ダイアログで件数を伝え、削除と同時に担当を「未定」に戻す（writeBatch） |

- 削除された家族の端末は、家族の選び直し画面へ移動する
- 画面の選択欄（mat-select）では「未定」を `UNDECIDED` という値で表し、保存するときに null に戻す

## 9. デザイン
- 配色B「ミント×スカイ」（2026-10-06 決定）
  - メイン：ミント `#0A8577`（文字・枠）／ボタンは `#0FA982 → #128FB5` のグラデーション
  - 背景：うすミント `#EEFAF8`、カードは白
  - アクセント：イエロー `#FFC24B`（「未定」や注意）
- フォント：丸ゴシック Zen Maru Gothic（Google Fonts）
- 色・角丸・フォントは `src/styles.scss` の CSS変数（:root）だけで管理する
- 参考スクリーンショットは確認後に削除済み

## 10. ライブラリのバージョン
- Angular 20 / Angular Material 20 / AngularFire 20.1.0
- Firebase SDK は **v11**（AngularFire 20.1.0 が v11 を前提にしているため。v12 を入れると2つの版が混ざって動かない）
- ルールのテストは @firebase/rules-unit-testing v4（Firebase v11 用）

## 11. 実装ステップ
1. 土台：Angular 作成、Material 導入、Firebase プロジェクト作成、AngularFire 接続、匿名認証、全拒否ルール、Hosting 初回公開
2. グループ作成・URLコピー・家族選択・タブの骨組み
3. 家族タブ・役割分担タブ
4. 会計タブ（支出、SettlementService とテスト、集金・返金チェック）
5. ダッシュボード・デザイン仕上げ・ルール最終化・本番公開
