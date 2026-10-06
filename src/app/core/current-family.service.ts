import { Injectable } from '@angular/core';

/**
 * 「この端末の人がどの家族か」を、ブラウザの localStorage に記憶するサービス。
 * グループ（roomId）ごとに別々に記憶する。
 */
@Injectable({ providedIn: 'root' })
export class CurrentFamilyService {
  private key(roomId: string): string {
    return `bbq-family:${roomId}`;
  }

  /** 記憶している家族IDを返す（まだ選んでいなければ null） */
  get(roomId: string): string | null {
    try {
      return localStorage.getItem(this.key(roomId));
    } catch {
      // プライベートモードなどで localStorage が使えない場合
      return null;
    }
  }

  /** 家族IDを記憶する */
  set(roomId: string, familyId: string): void {
    try {
      localStorage.setItem(this.key(roomId), familyId);
    } catch {
      // 保存できなくても、その場では使えるので何もしない
    }
  }
}
