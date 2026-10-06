import { TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { SettlementService } from './settlement.service';
import { Family } from '../models/family';
import { AssignedItem, Item, PerFamilyRentalItem, SharedRentalItem } from '../models/item';
import { Expense } from '../models/expense';
import { ExpenseCategory } from '../constants';

// テスト用のデータを作る関数
const createdAt = {} as Timestamp;

function family(id: string, adults: number, students = 0, preschoolers = 0, infants = 0): Family {
  return {
    id,
    name: `${id}家`,
    adults,
    students,
    preschoolers,
    infants,
    memo: '',
    collectionCheck: null,
    refundCheck: null,
    createdAt,
  };
}

function sharedRental(unitPrice: number, quantity: number): SharedRentalItem {
  return { id: 's', category: 'rental', splitType: 'shared', name: '焼き台', unitPrice, quantity, createdAt };
}

function perFamilyRental(unitPrice: number, quantities: Record<string, number>): PerFamilyRentalItem {
  return { id: 'p', category: 'rental', splitType: 'perFamily', name: '椅子', unitPrice, quantities, createdAt };
}

function expense(payerFamilyId: string, amount: number, description = '', category: ExpenseCategory = 'food'): Expense {
  return {
    id: `${payerFamilyId}-${amount}`,
    payerFamilyId,
    amount,
    category,
    description,
    createdByFamilyId: payerFamilyId,
    createdAt,
  };
}

describe('SettlementService', () => {
  let service: SettlementService;

  beforeEach(() => {
    service = TestBed.inject(SettlementService);
  });

  describe('人数の集計', () => {
    it('重み（大人1・小中0.5・幼児0.5・乳児0）で精算対象人数を計算する', () => {
      expect(service.familyWeight(family('A', 2, 0, 1, 1))).toBe(2.5);
      expect(service.familyWeight(family('B', 2, 2))).toBe(3);
      expect(service.familyWeight(family('C', 0, 0, 0, 3))).toBe(0);
    });

    it('区分別・総合計・精算対象人数をまとめる', () => {
      const summary = service.summarizePeople([
        family('A', 2, 0, 1, 1),
        family('B', 2, 2),
        family('C', 1, 2),
      ]);
      expect(summary.counts).toEqual({ adults: 5, students: 4, preschoolers: 1, infants: 1 });
      expect(summary.total).toBe(11);
      expect(summary.weightedTotal).toBe(7.5);
    });

    it('家族がいなければすべて0', () => {
      const summary = service.summarizePeople([]);
      expect(summary.total).toBe(0);
      expect(summary.weightedTotal).toBe(0);
    });

    it('おかしな値（マイナス・小数）は0人として扱う', () => {
      expect(service.familyTotal(family('X', -1, 1.5, 2))).toBe(2);
    });
  });

  describe('レンタル品', () => {
    const families = [family('A', 2), family('B', 2), family('C', 1)];

    it('全体で割る：小計 = 数量 × 単価', () => {
      expect(service.sharedSubtotal(sharedRental(1500, 2))).toBe(3000);
    });

    it('家庭ごと：家族ごとの金額・合計数量・小計', () => {
      const chair = perFamilyRental(300, { A: 4, B: 3, C: 3 });
      expect(service.familyAmount(chair, 'A')).toBe(1200);
      expect(service.familyAmount(chair, 'B')).toBe(900);
      expect(service.perFamilyTotalQuantity(chair, families)).toBe(10);
      expect(service.perFamilySubtotal(chair, families)).toBe(3000);
    });

    it('家庭ごと：入力していない家族は0', () => {
      const chair = perFamilyRental(300, { A: 2 });
      expect(service.familyQuantity(chair, 'B')).toBe(0);
      expect(service.perFamilySubtotal(chair, families)).toBe(600);
    });

    it('家庭ごと：削除された家族の数量は数えない', () => {
      const chair = perFamilyRental(300, { A: 2, deleted: 5 });
      expect(service.perFamilyTotalQuantity(chair, families)).toBe(2);
    });

    it('レンタル品全体の合計（食材などは含めない）', () => {
      const food: AssignedItem = {
        id: 'f',
        category: 'food',
        name: '牛肉',
        assigneeFamilyId: null,
        quantityText: '2kg',
        createdAt,
      };
      const items: Item[] = [sharedRental(1500, 2), perFamilyRental(300, { A: 4, B: 3, C: 3 }), food];
      expect(service.summarizeRentals(items, families)).toEqual({
        sharedTotal: 3000,
        perFamilyTotal: 3000,
        total: 6000,
      });
    });
  });

  describe('精算', () => {
    /** 家族IDで結果を取り出す */
    const byId = (result: ReturnType<SettlementService['settle']>, id: string) =>
      result.families.find((f) => f.family.id === id)!;

    it('計画書（docs/plan.md）の検算例：集金・返金・差引・余剰金', () => {
      // A：大人2・幼児1・乳児1（重み2.5）、B：大人2・小中2（3.0）、C：大人1・小中2（2.0）
      const families = [family('A', 2, 0, 1, 1), family('B', 2, 2), family('C', 1, 2)];
      const result = service.settle({
        families,
        items: [sharedRental(1500, 2), perFamilyRental(300, { A: 4, B: 3, C: 3 })],
        expenses: [expense('A', 12480, '食材'), expense('B', 5770, '飲み物')],
        rentalPayerFamilyId: 'C',
      });

      expect(result.expenseTotal).toBe(18250);
      expect(result.commonCost).toBe(21250); // 18,250 + 3,000
      expect(byId(result, 'A').collectAmount).toBe(8300); // 7,083.33 + 1,200 → 切り上げ
      expect(byId(result, 'B').collectAmount).toBe(9400); // 8,500 + 900（ちょうど）
      expect(byId(result, 'C').collectAmount).toBe(6600); // 5,666.67 + 900 → 切り上げ
      expect(byId(result, 'A').refundAmount).toBe(12480);
      expect(byId(result, 'B').refundAmount).toBe(5770);
      expect(byId(result, 'C').refundAmount).toBe(6000); // レンタル代
      expect(byId(result, 'A').balance).toBe(4180);
      expect(byId(result, 'B').balance).toBe(-3630);
      expect(byId(result, 'C').balance).toBe(-600);
      expect(result.collectTotal).toBe(24300);
      expect(result.refundTotal).toBe(24250);
      expect(result.surplus).toBe(50);
      expect(result.rentalExcluded).toBeFalse();
    });

    it('100円単位で切り上げ、ちょうど割り切れる額はそのまま', () => {
      // 共通費1,000円を3家族（大人1人ずつ）で割る → 333.33… → 400円ずつ
      const result = service.settle({
        families: [family('A', 1), family('B', 1), family('C', 1)],
        items: [],
        expenses: [expense('A', 1000)],
        rentalPayerFamilyId: null,
      });
      expect(result.families.map((f) => f.collectAmount)).toEqual([400, 400, 400]);
      expect(result.surplus).toBe(200); // 1,200 − 1,000

      // 共通費900円を3家族で割る → 300円ずつ（切り上げない）
      const exact = service.settle({
        families: [family('A', 1), family('B', 1), family('C', 1)],
        items: [],
        expenses: [expense('A', 900)],
        rentalPayerFamilyId: null,
      });
      expect(exact.families.map((f) => f.collectAmount)).toEqual([300, 300, 300]);
      expect(exact.surplus).toBe(0);
    });

    it('乳児だけの家族は、共通費を負担しない（集金0円）', () => {
      const result = service.settle({
        families: [family('A', 2), family('Baby', 0, 0, 0, 2)],
        items: [],
        expenses: [expense('A', 5000)],
        rentalPayerFamilyId: null,
      });
      expect(byId(result, 'Baby').weight).toBe(0);
      expect(byId(result, 'Baby').commonShare).toBe(0);
      expect(byId(result, 'Baby').collectAmount).toBe(0);
      expect(byId(result, 'A').collectAmount).toBe(5000);
    });

    it('支出がない家族は、返金0円で差引はマイナス（支払うだけ）', () => {
      const result = service.settle({
        families: [family('A', 1), family('B', 1)],
        items: [],
        expenses: [expense('A', 3000, 'お肉')],
        rentalPayerFamilyId: null,
      });
      expect(byId(result, 'B').refundAmount).toBe(0);
      expect(byId(result, 'B').refundDetails).toEqual([]);
      expect(byId(result, 'B').balance).toBe(-1500);
      expect(byId(result, 'A').refundDetails).toEqual([{ label: 'お肉', amount: 3000 }]);
      expect(byId(result, 'A').balance).toBe(1500);
    });

    it('支出が0件なら、レンタル品だけで精算する', () => {
      const result = service.settle({
        families: [family('A', 1), family('B', 1)],
        items: [sharedRental(1000, 2)],
        expenses: [],
        rentalPayerFamilyId: 'A',
      });
      expect(result.expenseTotal).toBe(0);
      expect(result.commonCost).toBe(2000);
      expect(result.families.map((f) => f.collectAmount)).toEqual([1000, 1000]);
      expect(byId(result, 'A').refundAmount).toBe(2000);
      expect(result.surplus).toBe(0);
    });

    it('支出もレンタルもなければ、すべて0円', () => {
      const result = service.settle({
        families: [family('A', 1)],
        items: [],
        expenses: [],
        rentalPayerFamilyId: null,
      });
      expect(result.collectTotal).toBe(0);
      expect(result.refundTotal).toBe(0);
      expect(result.surplus).toBe(0);
    });

    it('家庭ごとのレンタル品だけを使う家族（共通費の負担なし）は、その金額だけを払う', () => {
      // Baby 家は乳児だけ（重み0）だが、椅子を3脚借りる
      const result = service.settle({
        families: [family('A', 2), family('Baby', 0, 0, 0, 1)],
        items: [perFamilyRental(350, { A: 2, Baby: 3 })],
        expenses: [expense('A', 4000)],
        rentalPayerFamilyId: 'A',
      });
      const baby = byId(result, 'Baby');
      expect(baby.commonShare).toBe(0);
      expect(baby.perFamilyRental).toBe(1050);
      expect(baby.burden).toBe(1050);
      expect(baby.collectAmount).toBe(1100); // 1,050 → 切り上げ
      // A：共通費4,000円＋椅子700円
      expect(byId(result, 'A').collectAmount).toBe(4700);
      // A の返金：支出4,000円＋レンタル代1,750円
      expect(byId(result, 'A').refundAmount).toBe(5750);
      expect(result.surplus).toBe(50);
    });

    it('レンタル代を支払った家族が未定なら、レンタル品を除いて計算する', () => {
      const families = [family('A', 1), family('B', 1)];
      const result = service.settle({
        families,
        items: [sharedRental(1000, 2), perFamilyRental(300, { A: 1, B: 2 })],
        expenses: [expense('A', 2000)],
        rentalPayerFamilyId: null,
      });
      expect(result.rentalExcluded).toBeTrue();
      expect(result.excludedRentalTotal).toBe(2900);
      expect(result.rental.total).toBe(0);
      expect(result.commonCost).toBe(2000); // レンタルを含めない
      expect(result.families.map((f) => f.perFamilyRental)).toEqual([0, 0]);
      expect(result.families.map((f) => f.collectAmount)).toEqual([1000, 1000]);
      expect(result.refundTotal).toBe(2000); // レンタル代の返金もない
    });

    it('レンタル代を支払った家族が削除されていても、未定と同じ扱いにする', () => {
      const result = service.settle({
        families: [family('A', 1)],
        items: [sharedRental(1000, 1)],
        expenses: [],
        rentalPayerFamilyId: 'deleted',
      });
      expect(result.rentalExcluded).toBeTrue();
    });

    it('レンタル品がなければ、支払者が未定でも警告しない', () => {
      const result = service.settle({
        families: [family('A', 1)],
        items: [],
        expenses: [expense('A', 1000)],
        rentalPayerFamilyId: null,
      });
      expect(result.rentalExcluded).toBeFalse();
    });

    it('全員が乳児で共通費があると、割り振れないことを知らせる', () => {
      const result = service.settle({
        families: [family('Baby', 0, 0, 0, 1)],
        items: [],
        expenses: [expense('Baby', 1000)],
        rentalPayerFamilyId: null,
      });
      expect(result.noWeight).toBeTrue();
      expect(result.collectTotal).toBe(0);
    });

    it('余剰金は切り上げ分の余りなので、0円以上になる', () => {
      const result = service.settle({
        families: [family('A', 1, 1), family('B', 2, 0, 1), family('C', 1, 0, 0, 1), family('D', 3)],
        items: [sharedRental(777, 3), perFamilyRental(123, { A: 1, C: 4, D: 2 })],
        expenses: [expense('A', 12345), expense('D', 6789), expense('B', 1)],
        rentalPayerFamilyId: 'B',
      });
      expect(result.surplus).toBeGreaterThanOrEqual(0);
      expect(result.surplus).toBeLessThan(100 * 4); // 1家族あたり100円未満の余り
      expect(result.collectTotal - result.refundTotal).toBe(result.surplus);
      result.families.forEach((f) => expect(f.collectAmount % 100).toBe(0));
    });
  });
});
