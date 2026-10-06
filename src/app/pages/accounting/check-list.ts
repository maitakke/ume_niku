import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { CheckKind, FamilyService } from '../../core/family.service';
import { RoomStore } from '../../core/room.store';
import { Family } from '../../models/family';
import { YenPipe } from '../../shared/yen.pipe';

/** チェック一覧の1行 */
export interface CheckRow {
  family: Family;
  /** いまの金額（集金額 / 返金額） */
  amount: number;
  /** 補足（返金の一覧では「何を立て替えたか」） */
  note?: string;
}

/**
 * 集金・返金のチェック一覧（CLAUDE.md「集金・返金チェックのルール」）
 * - チェックすると、チェックした家族・日時・その時点の金額を記録する
 * - その後に金額が変わったら、行に警告を出す
 * - チェックを外すときは確認ダイアログを出し、記録も消す
 */
@Component({
  selector: 'app-check-list',
  imports: [DatePipe, MatIconModule, YenPipe],
  templateUrl: './check-list.html',
  styleUrl: './check-list.scss',
})
export class CheckList {
  protected readonly store = inject(RoomStore);
  private readonly familyService = inject(FamilyService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly snackBar = inject(MatSnackBar);

  /** 集金（collectionCheck）か返金（refundCheck）か */
  readonly kind = input.required<CheckKind>();
  /** 見出し（「集金」「返金」） */
  readonly title = input.required<string>();
  readonly rows = input.required<CheckRow[]>();

  /** 「受取済み」「返金済み」 */
  protected readonly doneWord = computed(() =>
    this.kind() === 'collectionCheck' ? '受取済み' : '返金済み',
  );

  /** 見出しの「集金済み」「返金済み」 */
  protected readonly progressWord = computed(() =>
    this.kind() === 'collectionCheck' ? '集金済み' : '返金済み',
  );

  /** 見出しの進捗：「○ / ○家族　¥○○ / ¥○○」 */
  protected readonly progress = computed(() => {
    const rows = this.rows();
    const checked = rows.filter((row) => this.record(row) !== null);
    return {
      checkedCount: checked.length,
      totalCount: rows.length,
      // 左側は、チェックしたときに記録した金額（実際に受け渡した額）の合計
      checkedAmount: checked.reduce((sum, row) => sum + (this.record(row)?.amount ?? 0), 0),
      totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
    };
  });

  /** その行のチェックの記録（未チェックなら null） */
  protected record(row: CheckRow) {
    return row.family[this.kind()];
  }

  /** チェック後に金額が変わっていれば、その差額（いま − 記録）。変わっていなければ 0 */
  protected difference(row: CheckRow): number {
    const record = this.record(row);
    return record ? row.amount - record.amount : 0;
  }

  /** チェックをつける／外す */
  async toggle(row: CheckRow): Promise<void> {
    const roomId = this.store.roomId();
    const myFamilyId = this.store.currentFamilyId();
    try {
      if (this.record(row) === null) {
        if (!myFamilyId) {
          return;
        }
        await this.familyService.check(roomId, row.family.id, this.kind(), row.amount, myFamilyId);
      } else {
        // 誤操作を防ぐため、外すときは確認する
        const ok = await this.confirmDialog.confirm({
          title: `${row.family.name}の${this.title()}チェックを外しますか？`,
          message: 'チェックした家族・日時・金額の記録も消えます。',
          confirmLabel: '外す',
          danger: true,
        });
        if (ok) {
          await this.familyService.uncheck(roomId, row.family.id, this.kind());
        }
      }
    } catch (error) {
      console.error('チェックを保存できませんでした', error);
      this.snackBar.open('保存できませんでした。もう一度お試しください', undefined, {
        duration: 3000,
        panelClass: 'above-tab-bar',
      });
    }
  }
}
