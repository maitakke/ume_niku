import { Injectable } from '@angular/core';
import { PERSON_CATEGORIES, PersonCategory, SETTLEMENT_WEIGHTS } from '../constants';
import { Family } from '../models/family';
import { Item, PerFamilyRentalItem, RentalItem, SharedRentalItem } from '../models/item';

/** 人数の集計結果 */
export interface PeopleSummary {
  /** 区分ごとの人数 */
  counts: Record<PersonCategory, number>;
  /** 総合計人数 */
  total: number;
  /** 精算対象人数（重みの合計） */
  weightedTotal: number;
}

/** レンタル品の集計結果 */
export interface RentalSummary {
  /** 「全体で割る」レンタル品の合計（円） */
  sharedTotal: number;
  /** 「家庭ごと」レンタル品の合計（円） */
  perFamilyTotal: number;
  /** レンタル品の合計（円） */
  total: number;
}

/**
 * 人数やお金の計算をまとめたサービス。
 * Firestore には触らず「データを渡すと結果が返る」だけなので、ユニットテストで確かめやすい。
 * （精算の計算は Step 4 でここに追加する）
 */
@Injectable({ providedIn: 'root' })
export class SettlementService {
  // ===== 人数 =====

  /** 1家族の精算対象人数（重みの合計） */
  familyWeight(family: Family): number {
    return PERSON_CATEGORIES.reduce(
      (sum, { key }) => sum + toCount(family[key]) * SETTLEMENT_WEIGHTS[key],
      0,
    );
  }

  /** 1家族の合計人数 */
  familyTotal(family: Family): number {
    return PERSON_CATEGORIES.reduce((sum, { key }) => sum + toCount(family[key]), 0);
  }

  /** 全家族の人数の集計 */
  summarizePeople(families: Family[]): PeopleSummary {
    const counts = { adults: 0, students: 0, preschoolers: 0, infants: 0 };
    for (const family of families) {
      for (const { key } of PERSON_CATEGORIES) {
        counts[key] += toCount(family[key]);
      }
    }
    return {
      counts,
      total: families.reduce((sum, family) => sum + this.familyTotal(family), 0),
      weightedTotal: families.reduce((sum, family) => sum + this.familyWeight(family), 0),
    };
  }

  // ===== レンタル品 =====

  /** 「全体で割る」レンタル品の小計（数量 × 単価） */
  sharedSubtotal(item: SharedRentalItem): number {
    return toCount(item.quantity) * toCount(item.unitPrice);
  }

  /** 「家庭ごと」レンタル品の、ある家族の数量 */
  familyQuantity(item: PerFamilyRentalItem, familyId: string): number {
    return toCount(item.quantities?.[familyId]);
  }

  /** 「家庭ごと」レンタル品の、ある家族の金額（数量 × 単価） */
  familyAmount(item: PerFamilyRentalItem, familyId: string): number {
    return this.familyQuantity(item, familyId) * toCount(item.unitPrice);
  }

  /**
   * 「家庭ごと」レンタル品の合計数量。
   * いま登録されている家族の分だけを数える（削除された家族の値は数えない）
   */
  perFamilyTotalQuantity(item: PerFamilyRentalItem, families: Family[]): number {
    return families.reduce((sum, family) => sum + this.familyQuantity(item, family.id), 0);
  }

  /** 「家庭ごと」レンタル品の小計（合計数量 × 単価） */
  perFamilySubtotal(item: PerFamilyRentalItem, families: Family[]): number {
    return this.perFamilyTotalQuantity(item, families) * toCount(item.unitPrice);
  }

  /** レンタル品1つの小計 */
  rentalSubtotal(item: RentalItem, families: Family[]): number {
    return item.splitType === 'shared'
      ? this.sharedSubtotal(item)
      : this.perFamilySubtotal(item, families);
  }

  /** レンタル品全体の集計 */
  summarizeRentals(items: Item[], families: Family[]): RentalSummary {
    let sharedTotal = 0;
    let perFamilyTotal = 0;
    for (const item of items) {
      if (item.category !== 'rental') {
        continue;
      }
      if (item.splitType === 'shared') {
        sharedTotal += this.sharedSubtotal(item);
      } else {
        perFamilyTotal += this.perFamilySubtotal(item, families);
      }
    }
    return { sharedTotal, perFamilyTotal, total: sharedTotal + perFamilyTotal };
  }
}

/**
 * 人数・数量・金額として使える値（0以上の整数）にそろえる。
 * 万一おかしな値（マイナス、小数、文字列など）が入っていても 0 として扱い、計算が壊れないようにする。
 */
function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}
