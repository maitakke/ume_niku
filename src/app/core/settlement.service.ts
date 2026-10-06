import { Injectable } from '@angular/core';
import {
  COLLECTION_ROUNDING_UNIT,
  PERSON_CATEGORIES,
  PersonCategory,
  SETTLEMENT_WEIGHTS,
} from '../constants';
import { Expense } from '../models/expense';
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

/** 精算の計算に使うデータ */
export interface SettlementInput {
  families: Family[];
  items: Item[];
  expenses: Expense[];
  /** レンタル代を支払った家族のID（未定なら null） */
  rentalPayerFamilyId: string | null;
}

/** 1家族分の精算結果 */
export interface FamilySettlement {
  family: Family;
  /** 精算対象人数（重みの合計） */
  weight: number;
  /** 共通費の負担額（円・表示用に1円未満を四捨五入） */
  commonShare: number;
  /** 「家庭ごと」レンタル品の金額（円） */
  perFamilyRental: number;
  /** 負担額＝共通費の負担額＋家庭ごとレンタル（円・表示用に1円未満を四捨五入） */
  burden: number;
  /** 集金額（負担額を100円単位で切り上げた額） */
  collectAmount: number;
  /** 返金額（立て替えた額） */
  refundAmount: number;
  /** 差引＝返金額−集金額（プラスなら受け取る、マイナスなら支払う） */
  balance: number;
  /** 何を立て替えたか（返金の一覧に表示する） */
  refundDetails: { label: string; amount: number }[];
}

/** 精算の結果 */
export interface SettlementResult {
  families: FamilySettlement[];
  /** 支出の合計 */
  expenseTotal: number;
  /** 精算に入れたレンタル品（支払者が未定なら0） */
  rental: RentalSummary;
  /** 共通費＝支出の合計＋「全体で割る」レンタル品の合計 */
  commonCost: number;
  /** 集金合計 */
  collectTotal: number;
  /** 返金合計 */
  refundTotal: number;
  /** 余剰金＝集金合計−返金合計 */
  surplus: number;
  /** レンタル支払者が未定のため、レンタル品を除いて計算したか（除いた金額が0なら false） */
  rentalExcluded: boolean;
  /** 除いたレンタル品の合計 */
  excludedRentalTotal: number;
  /** 精算対象人数が0人なので、共通費を割り振れなかったか */
  noWeight: boolean;
}

/**
 * 人数やお金の計算をまとめたサービス。
 * Firestore には触らず「データを渡すと結果が返る」だけなので、ユニットテストで確かめやすい。
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

  // ===== 精算 =====

  /**
   * 精算を計算する（CLAUDE.md「精算のルール」）
   *
   * - 共通費 ＝ 支出の合計 ＋「全体で割る」レンタル品の合計
   * - 負担額 ＝ 共通費 ×（その家族の重み ÷ 全家族の重み）＋ その家族の「家庭ごと」レンタル品の金額
   * - 集金額 ＝ 負担額を100円単位で切り上げ
   * - 返金額 ＝ 立て替えた支出 ＋（レンタル代を支払った家族なら）レンタル品の合計
   * - 余剰金 ＝ 集金合計 − 返金合計
   * - レンタル代を支払った家族が未定なら、レンタル品を除いて計算する
   *
   * 小数の誤差を防ぐため、重みは2倍した整数（大人2・小中1・幼児1・乳児0）で扱い、
   * 割り算は最後に1回だけ行う。
   */
  settle(input: SettlementInput): SettlementResult {
    const { families, items, expenses } = input;

    // レンタル代を支払った家族が、いま登録されている家族の中にいるか
    const payerKnown = families.some((family) => family.id === input.rentalPayerFamilyId);
    const fullRental = this.summarizeRentals(items, families);
    const rental: RentalSummary = payerKnown
      ? fullRental
      : { sharedTotal: 0, perFamilyTotal: 0, total: 0 };

    const expenseTotal = expenses.reduce((sum, expense) => sum + toCount(expense.amount), 0);
    const commonCost = expenseTotal + rental.sharedTotal;

    // 重み（2倍した整数）
    const doubledWeights = families.map((family) => doubledWeight(family));
    const totalDoubledWeight = doubledWeights.reduce((sum, weight) => sum + weight, 0);

    const results = families.map((family, index): FamilySettlement => {
      const familyWeight = doubledWeights[index];
      const perFamilyRental = payerKnown ? this.perFamilyRentalAmount(items, family.id) : 0;

      // 共通費の負担分を「分子 / 分母」のまま持ち、割り算は最後に1回だけにする
      const shareNumerator = totalDoubledWeight > 0 ? commonCost * familyWeight : 0;
      const shareDenominator = totalDoubledWeight > 0 ? totalDoubledWeight : 1;
      // 負担額 ＝ (共通費×重み ＋ 家庭ごとレンタル×重み合計) ÷ 重み合計
      const burdenNumerator = shareNumerator + perFamilyRental * shareDenominator;
      const unit = COLLECTION_ROUNDING_UNIT;
      const collectAmount = Math.ceil(burdenNumerator / (shareDenominator * unit)) * unit;

      const refundDetails = expenses
        .filter((expense) => expense.payerFamilyId === family.id)
        .map((expense) => ({
          label: expense.description || '（内容なし）',
          amount: toCount(expense.amount),
        }));
      if (payerKnown && family.id === input.rentalPayerFamilyId && rental.total > 0) {
        refundDetails.push({ label: 'レンタル代', amount: rental.total });
      }
      const refundAmount = refundDetails.reduce((sum, detail) => sum + detail.amount, 0);

      return {
        family,
        weight: familyWeight / 2,
        commonShare: Math.round(shareNumerator / shareDenominator),
        perFamilyRental,
        burden: Math.round(burdenNumerator / shareDenominator),
        collectAmount,
        refundAmount,
        balance: refundAmount - collectAmount,
        refundDetails,
      };
    });

    const collectTotal = results.reduce((sum, result) => sum + result.collectAmount, 0);
    const refundTotal = results.reduce((sum, result) => sum + result.refundAmount, 0);

    return {
      families: results,
      expenseTotal,
      rental,
      commonCost,
      collectTotal,
      refundTotal,
      surplus: collectTotal - refundTotal,
      rentalExcluded: !payerKnown && fullRental.total > 0,
      excludedRentalTotal: payerKnown ? 0 : fullRental.total,
      noWeight: totalDoubledWeight === 0 && commonCost > 0,
    };
  }

  /** ある家族の「家庭ごと」レンタル品の金額の合計 */
  private perFamilyRentalAmount(items: Item[], familyId: string): number {
    return items.reduce(
      (sum, item) =>
        item.category === 'rental' && item.splitType === 'perFamily'
          ? sum + this.familyAmount(item, familyId)
          : sum,
      0,
    );
  }
}

/** 重みを2倍した整数（大人2・小中1・幼児1・乳児0）。小数の誤差を出さないために使う */
function doubledWeight(family: Family): number {
  return PERSON_CATEGORIES.reduce(
    (sum, { key }) => sum + toCount(family[key]) * Math.round(SETTLEMENT_WEIGHTS[key] * 2),
    0,
  );
}

/**
 * 人数・数量・金額として使える値（0以上の整数）にそろえる。
 * 万一おかしな値（マイナス、小数、文字列など）が入っていても 0 として扱い、計算が壊れないようにする。
 */
function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}
