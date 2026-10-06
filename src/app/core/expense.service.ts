import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable, catchError, map, of } from 'rxjs';
import { ExpenseCategory } from '../constants';
import { Expense } from '../models/expense';
import { injectFirebaseContext } from './firebase-context';

/** 支出の入力内容 */
export interface ExpenseInput {
  payerFamilyId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
}

/** 支出（rooms/{roomId}/expenses）の読み書きを担当するサービス */
@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly firestore = inject(Firestore);
  private readonly inFirebaseContext = injectFirebaseContext();

  private expensesRef(roomId: string) {
    return collection(this.firestore, 'rooms', roomId, 'expenses');
  }

  private expenseRef(roomId: string, expenseId: string) {
    return doc(this.firestore, 'rooms', roomId, 'expenses', expenseId);
  }

  /** 支出の一覧を、登録順にリアルタイムで購読する */
  watchExpenses(roomId: string): Observable<Expense[]> {
    return this.inFirebaseContext(() =>
      collectionData(query(this.expensesRef(roomId), orderBy('createdAt')), { idField: 'id' }),
    ).pipe(
      map((expenses) => expenses as Expense[]),
      catchError((error) => {
        console.error('支出を読み込めませんでした', error);
        return of([]);
      }),
    );
  }

  /** 支出を登録する（登録した家族を自動で記録する） */
  async addExpense(roomId: string, input: ExpenseInput, createdByFamilyId: string): Promise<void> {
    await this.inFirebaseContext(() =>
      addDoc(this.expensesRef(roomId), {
        ...input,
        createdByFamilyId,
        createdAt: serverTimestamp(),
      }),
    );
  }

  /** 支出を編集する（登録した家族・登録日時は変えない） */
  async updateExpense(roomId: string, expenseId: string, input: ExpenseInput): Promise<void> {
    await this.inFirebaseContext(() => updateDoc(this.expenseRef(roomId, expenseId), { ...input }));
  }

  /** 支出を削除する */
  async deleteExpense(roomId: string, expenseId: string): Promise<void> {
    await this.inFirebaseContext(() => deleteDoc(this.expenseRef(roomId, expenseId)));
  }
}
