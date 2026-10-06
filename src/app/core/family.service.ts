import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  orderBy,
  query,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, catchError, map, of } from 'rxjs';
import { Family } from '../models/family';
import { injectFirebaseContext } from './firebase-context';

/** 参加家族（rooms/{roomId}/families）の読み書きを担当するサービス */
@Injectable({ providedIn: 'root' })
export class FamilyService {
  private readonly firestore = inject(Firestore);
  private readonly inFirebaseContext = injectFirebaseContext();

  /** 家族の一覧を、登録順にリアルタイムで購読する */
  watchFamilies(roomId: string): Observable<Family[]> {
    return this.inFirebaseContext(() =>
      collectionData(
        query(collection(this.firestore, 'rooms', roomId, 'families'), orderBy('createdAt')),
        { idField: 'id' },
      ),
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
   * 人数は0人で作り、あとから「家族」タブで編集する。
   */
  async addFamily(roomId: string, name: string): Promise<string> {
    const ref = await this.inFirebaseContext(() =>
      addDoc(collection(this.firestore, 'rooms', roomId, 'families'), {
        name,
        adults: 0,
        students: 0,
        preschoolers: 0,
        infants: 0,
        memo: '',
        collectionCheck: null,
        refundCheck: null,
        createdAt: serverTimestamp(),
      }),
    );
    return ref.id;
  }
}
