import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable, catchError, map, of } from 'rxjs';
import { Family } from '../models/family';
import { injectFirebaseContext } from './firebase-context';

/** 家族の入力内容（名前・人数・メモ） */
export interface FamilyInput {
  name: string;
  adults: number;
  students: number;
  preschoolers: number;
  infants: number;
  memo: string;
}

/** 参加家族（rooms/{roomId}/families）の読み書きを担当するサービス */
@Injectable({ providedIn: 'root' })
export class FamilyService {
  private readonly firestore = inject(Firestore);
  private readonly inFirebaseContext = injectFirebaseContext();

  private familiesRef(roomId: string) {
    return collection(this.firestore, 'rooms', roomId, 'families');
  }

  private familyRef(roomId: string, familyId: string) {
    return doc(this.firestore, 'rooms', roomId, 'families', familyId);
  }

  /** 家族の一覧を、登録順にリアルタイムで購読する */
  watchFamilies(roomId: string): Observable<Family[]> {
    return this.inFirebaseContext(() =>
      collectionData(query(this.familiesRef(roomId), orderBy('createdAt')), { idField: 'id' }),
    ).pipe(
      map((families) => families as Family[]),
      catchError((error) => {
        console.error('家族の一覧を読み込めませんでした', error);
        return of([]);
      }),
    );
  }

  /**
   * 家族を名前だけで追加し、追加した家族のIDを返す。
   * （「どの家族ですか？」画面用。人数は0人で作り、あとから「家族」タブで編集する）
   */
  async addFamily(roomId: string, name: string): Promise<string> {
    return this.addFamilyWithDetails(roomId, {
      name,
      adults: 0,
      students: 0,
      preschoolers: 0,
      infants: 0,
      memo: '',
    });
  }

  /** 家族を、人数やメモも含めて追加し、追加した家族のIDを返す */
  async addFamilyWithDetails(roomId: string, input: FamilyInput): Promise<string> {
    const ref = await this.inFirebaseContext(() =>
      addDoc(this.familiesRef(roomId), {
        ...input,
        collectionCheck: null,
        refundCheck: null,
        createdAt: serverTimestamp(),
      }),
    );
    return ref.id;
  }

  /** 家族の名前・人数・メモを編集する */
  async updateFamily(roomId: string, familyId: string, input: FamilyInput): Promise<void> {
    await this.inFirebaseContext(() => updateDoc(this.familyRef(roomId, familyId), { ...input }));
  }

  /** その家族が立て替えた支出が1件でもあるか */
  async hasExpenses(roomId: string, familyId: string): Promise<boolean> {
    const snapshot = await this.inFirebaseContext(() =>
      getDocs(
        query(
          collection(this.firestore, 'rooms', roomId, 'expenses'),
          where('payerFamilyId', '==', familyId),
          limit(1),
        ),
      ),
    );
    return !snapshot.empty;
  }

  /**
   * 家族を削除する。
   * その家族が担当していた品目（assignedItemIds）は、同時に担当を「未定」に戻す。
   * writeBatch を使うと「全部成功」か「全部失敗」のどちらかになり、途中で止まらない。
   */
  async deleteFamily(roomId: string, familyId: string, assignedItemIds: string[]): Promise<void> {
    await this.inFirebaseContext(() => {
      const batch = writeBatch(this.firestore);
      for (const itemId of assignedItemIds) {
        batch.update(doc(this.firestore, 'rooms', roomId, 'items', itemId), {
          assigneeFamilyId: null,
        });
      }
      batch.delete(this.familyRef(roomId, familyId));
      return batch.commit();
    });
  }
}
