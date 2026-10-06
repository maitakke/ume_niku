import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  doc,
  docData,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, catchError, map, of } from 'rxjs';
import { Room } from '../models/room';
import { injectFirebaseContext } from './firebase-context';

/** グループ（rooms）の読み書きを担当するサービス */
@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly firestore = inject(Firestore);
  private readonly inFirebaseContext = injectFirebaseContext();

  /**
   * 新しいグループを作り、作られたグループのID（roomId）を返す。
   * roomId は Firestore の自動ID（推測されにくい20文字のランダムな英数字）になる。
   */
  async createRoom(name: string): Promise<string> {
    const ref = await this.inFirebaseContext(() =>
      addDoc(collection(this.firestore, 'rooms'), {
        name,
        rentalPayerFamilyId: null,
        createdAt: serverTimestamp(),
      }),
    );
    return ref.id;
  }

  /**
   * グループをリアルタイムで購読する。
   * 存在しない（または読めない）グループのときは null を流す。
   */
  watchRoom(roomId: string): Observable<Room | null> {
    // 形が正しくない roomId（英数字20文字以上でない）は、問い合わせるまでもなく「見つからない」
    if (!/^[A-Za-z0-9]{20,}$/.test(roomId)) {
      return of(null);
    }
    return this.inFirebaseContext(() =>
      docData(doc(this.firestore, 'rooms', roomId), { idField: 'id' }),
    ).pipe(
      map((room) => (room ? (room as Room) : null)),
      catchError((error) => {
        console.error('グループを読み込めませんでした', error);
        return of(null);
      }),
    );
  }
}
