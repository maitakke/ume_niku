import { TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { SettlementService } from './settlement.service';
import { Family } from '../models/family';
import { AssignedItem, Item, PerFamilyRentalItem, SharedRentalItem } from '../models/item';

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
});
