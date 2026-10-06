import { Injectable, inject } from '@angular/core';
import {
  FieldPath,
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
import { Item, SplitType } from '../models/item';
import { injectFirebaseContext } from './firebase-context';

/** 食材・持ち寄り物品の入力内容 */
export interface AssignedItemInput {
  name: string;
  assigneeFamilyId: string | null;
  quantityText: string;
}

/** レンタル品の入力内容（quantity は「全体で割る」のときだけ使う） */
export interface RentalItemInput {
  name: string;
  unitPrice: number;
  quantity: number;
}

/** 役割分担（rooms/{roomId}/items）の読み書きを担当するサービス */
@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly firestore = inject(Firestore);
  private readonly inFirebaseContext = injectFirebaseContext();

  private itemsRef(roomId: string) {
    return collection(this.firestore, 'rooms', roomId, 'items');
  }

  private itemRef(roomId: string, itemId: string) {
    return doc(this.firestore, 'rooms', roomId, 'items', itemId);
  }

  /** 品目の一覧を、登録順にリアルタイムで購読する */
  watchItems(roomId: string): Observable<Item[]> {
    return this.inFirebaseContext(() =>
      collectionData(query(this.itemsRef(roomId), orderBy('createdAt')), { idField: 'id' }),
    ).pipe(
      map((items) => items as Item[]),
      catchError((error) => {
        console.error('役割分担を読み込めませんでした', error);
        return of([]);
      }),
    );
  }

  /** 食材・持ち寄り物品を追加する */
  async addAssignedItem(
    roomId: string,
    category: 'food' | 'bring',
    input: AssignedItemInput,
  ): Promise<void> {
    await this.inFirebaseContext(() =>
      addDoc(this.itemsRef(roomId), { category, ...input, createdAt: serverTimestamp() }),
    );
  }

  /** 食材・持ち寄り物品を編集する */
  async updateAssignedItem(roomId: string, itemId: string, input: AssignedItemInput): Promise<void> {
    await this.inFirebaseContext(() => updateDoc(this.itemRef(roomId, itemId), { ...input }));
  }

  /** レンタル品を追加する */
  async addRentalItem(roomId: string, splitType: SplitType, input: RentalItemInput): Promise<void> {
    const data =
      splitType === 'shared'
        ? { name: input.name, unitPrice: input.unitPrice, quantity: input.quantity }
        : { name: input.name, unitPrice: input.unitPrice, quantities: {} };
    await this.inFirebaseContext(() =>
      addDoc(this.itemsRef(roomId), {
        category: 'rental',
        splitType,
        ...data,
        createdAt: serverTimestamp(),
      }),
    );
  }

  /**
   * レンタル品を編集する（分け方は変更できない）。
   * 「家庭ごと」の場合は品名と単価だけを書き換え、家族ごとの数量には触れない。
   */
  async updateRentalItem(
    roomId: string,
    itemId: string,
    splitType: SplitType,
    input: RentalItemInput,
  ): Promise<void> {
    const data =
      splitType === 'shared'
        ? { name: input.name, unitPrice: input.unitPrice, quantity: input.quantity }
        : { name: input.name, unitPrice: input.unitPrice };
    await this.inFirebaseContext(() => updateDoc(this.itemRef(roomId, itemId), data));
  }

  /**
   * 「家庭ごと」レンタル品の、ある家族の数量だけを更新する。
   *
   * マップ全体（quantities）を書き換えると、同時に入力した他の家族の値を消してしまう。
   * そこで「quantities の中の familyId のキー」だけを指定して更新する。
   * FieldPath を使うと、familyId にどんな文字が入っていても安全に指定できる。
   */
  async setFamilyQuantity(
    roomId: string,
    itemId: string,
    familyId: string,
    quantity: number,
  ): Promise<void> {
    await this.inFirebaseContext(() =>
      updateDoc(this.itemRef(roomId, itemId), new FieldPath('quantities', familyId), quantity),
    );
  }

  /** 品目を削除する */
  async deleteItem(roomId: string, itemId: string): Promise<void> {
    await this.inFirebaseContext(() => deleteDoc(this.itemRef(roomId, itemId)));
  }
}
