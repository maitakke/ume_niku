// アプリ全体で使う決まった値（画面からは変更しない）

/** 人数の区分 */
export type PersonCategory = 'adults' | 'students' | 'preschoolers' | 'infants';

/** 人数の区分の並び順と表示名 */
export const PERSON_CATEGORIES: { key: PersonCategory; label: string }[] = [
  { key: 'adults', label: '大人' },
  { key: 'students', label: '小中学生' },
  { key: 'preschoolers', label: '幼児' },
  { key: 'infants', label: '乳児' },
];

/**
 * 精算の重み（1人あたり何人分を負担するか）
 * ※ 重みを変えるときは、ここだけを直す
 * ※ 計算で小数の誤差を出さないため、重みは 0.5 刻みで指定すること
 */
export const SETTLEMENT_WEIGHTS: Record<PersonCategory, number> = {
  adults: 1,
  students: 0.5,
  preschoolers: 0.5,
  infants: 0,
};

/** 1家族・1区分あたりの人数の上限 */
export const MAX_PEOPLE_PER_CATEGORY = 99;

/** 役割分担のカテゴリの表示名 */
export const ITEM_CATEGORY_LABELS = {
  food: '食材',
  bring: '持ち寄り',
  rental: 'レンタル',
} as const;

/** レンタル品の分け方の表示名 */
export const SPLIT_TYPE_LABELS = {
  shared: '全体で割る',
  perFamily: '家庭ごと',
} as const;

/** レンタル品の単価の上限（円） */
export const MAX_UNIT_PRICE = 1_000_000;

/** レンタル品の数量の上限 */
export const MAX_RENTAL_QUANTITY = 999;

/**
 * 選択欄（mat-select）で「未定」を表すための値。
 * mat-select は null を「何も選んでいない」と扱い、「未定」と表示されなくなるため、
 * 画面の中だけこの値を使い、保存するときに null に戻す。
 */
export const UNDECIDED = '__undecided__';

/** 支出のカテゴリ */
export type ExpenseCategory = 'food' | 'drink' | 'equipment' | 'venue' | 'other';

/** 支出のカテゴリの並び順と表示名 */
export const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string }[] = [
  { key: 'food', label: '食材' },
  { key: 'drink', label: '飲み物' },
  { key: 'equipment', label: '備品' },
  { key: 'venue', label: '会場' },
  { key: 'other', label: 'その他' },
];

/** 支出1件の金額の上限（円） */
export const MAX_EXPENSE_AMOUNT = 1_000_000;

/** 集金額を切り上げる単位（円） */
export const COLLECTION_ROUNDING_UNIT = 100;

/**
 * 家族ごとの色（持ち寄りの一覧で使う。家族の登録順に割り当てる）
 * 色だけで見分けなくてよいよう、一覧には家族の名前も必ず表示する。
 * 11家族目からは、また最初の色から使う。
 */
export const FAMILY_COLORS = [
  '#12A594', // ミント
  '#C98A0E', // からし
  '#3B82D6', // 青
  '#E0604A', // さんご
  '#8B5CD6', // むらさき
  '#D6458B', // ピンク
  '#4C9A2A', // 緑
  '#9A6B3F', // 茶
  '#2F5DA8', // 紺
  '#5F7A8A', // 灰青
];
