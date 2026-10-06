import { Timestamp } from '@angular/fire/firestore';

/** 役割分担のカテゴリ（食材／持ち寄り物品／レンタル品） */
export type ItemCategory = 'food' | 'bring' | 'rental';

/** レンタル品の分け方（全体で割る／家庭ごと） */
export type SplitType = 'shared' | 'perFamily';

/** すべての品目に共通する項目 */
interface ItemBase {
  id: string;
  /** 品名 */
  name: string;
  createdAt: Timestamp;
}

/** 食材・持ち寄り物品 */
export interface AssignedItem extends ItemBase {
  category: 'food' | 'bring';
  /** 担当家族のID。未定なら null */
  assigneeFamilyId: string | null;
  /** 数量（「2kg」「3パック」などの自由入力） */
  quantityText: string;
}

/** レンタル品（全体で割る） */
export interface SharedRentalItem extends ItemBase {
  category: 'rental';
  splitType: 'shared';
  /** 単価（円） */
  unitPrice: number;
  /** 数量 */
  quantity: number;
}

/** レンタル品（家庭ごと） */
export interface PerFamilyRentalItem extends ItemBase {
  category: 'rental';
  splitType: 'perFamily';
  /** 単価（円） */
  unitPrice: number;
  /** 家族ごとの数量（familyId → 数量） */
  quantities: Record<string, number>;
}

export type RentalItem = SharedRentalItem | PerFamilyRentalItem;

export type Item = AssignedItem | RentalItem;
