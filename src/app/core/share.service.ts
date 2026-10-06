import { Injectable, inject } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';

/** 共有URLの作成とコピーを担当するサービス */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);

  /** グループの共有URL（例：https://umeniku-bbq.web.app/r/xxxx） */
  roomUrl(roomId: string): string {
    return `${location.origin}/r/${roomId}`;
  }

  /** 共有URLをコピーして、結果を画面下に表示する */
  copyRoomUrl(roomId: string): void {
    const copied = this.clipboard.copy(this.roomUrl(roomId));
    this.snackBar.open(
      copied ? 'コピーしました' : 'コピーできませんでした。URLを長押ししてコピーしてください',
      undefined,
      { duration: 2500, panelClass: 'above-tab-bar' },
    );
  }
}
