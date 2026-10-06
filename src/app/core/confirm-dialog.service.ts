import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from '../shared/confirm-dialog';

/**
 * 確認ダイアログを開くサービス。
 * 使い方：if (await this.confirmDialog.confirmDelete('牛肉')) { ...削除する... }
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  /** 確認ダイアログを開き、「はい」なら true を返す */
  async confirm(options: Partial<ConfirmDialogData> & { title: string }): Promise<boolean> {
    const data: ConfirmDialogData = {
      message: '',
      confirmLabel: 'OK',
      cancelLabel: 'キャンセル',
      danger: false,
      ...options,
    };
    const ref = this.dialog.open(ConfirmDialog, { data, width: '360px', maxWidth: '90vw' });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }

  /** 削除の確認ダイアログ（「○○を削除しますか？」） */
  confirmDelete(name: string, message = ''): Promise<boolean> {
    return this.confirm({
      title: `「${name}」を削除しますか？`,
      message: message || 'この操作は取り消せません。',
      confirmLabel: '削除する',
      danger: true,
    });
  }

  /** お知らせだけのダイアログ（ボタンは「OK」のみ） */
  async alert(title: string, message: string): Promise<void> {
    await this.confirm({ title, message, cancelLabel: null });
  }
}
