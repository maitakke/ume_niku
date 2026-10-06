import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/** 確認ダイアログに渡す内容 */
export interface ConfirmDialogData {
  /** 見出し */
  title: string;
  /** 本文（改行は \n） */
  message: string;
  /** 「はい」側のボタンの文字 */
  confirmLabel: string;
  /** 「いいえ」側のボタンの文字。null ならボタンを出さない（お知らせだけのとき） */
  cancelLabel: string | null;
  /** 削除などの取り消せない操作なら true（ボタンを赤くする） */
  danger: boolean;
}

/** 確認ダイアログの見た目。ConfirmDialogService から開く */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      @if (data.cancelLabel) {
        <button mat-stroked-button [mat-dialog-close]="false" class="action">
          {{ data.cancelLabel }}
        </button>
      }
      <button
        mat-flat-button
        [mat-dialog-close]="true"
        class="action"
        [class.danger]="data.danger"
        cdkFocusInitial
      >
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .message {
      white-space: pre-line; // \\n で改行する
    }

    mat-dialog-actions {
      gap: 8px;
      padding: 0 24px 20px;
    }

    .action {
      flex: 1;
    }

    // 削除ボタンは赤
    .mat-mdc-unelevated-button.danger:not(:disabled) {
      background: var(--color-error);
      box-shadow: 0 4px 0 #a33434;
    }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
