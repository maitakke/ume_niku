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
