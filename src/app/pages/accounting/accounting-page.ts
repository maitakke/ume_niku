import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EXPENSE_CATEGORIES } from '../../constants';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { ExpenseInput, ExpenseService } from '../../core/expense.service';
import { RoomStore } from '../../core/room.store';
import { Expense } from '../../models/expense';
import { YenPipe } from '../../shared/yen.pipe';
import { CheckList, CheckRow } from './check-list';
import { ExpenseForm } from './expense-form';

/**
 * 会計タブ（CLAUDE.md「会計タブの構成」の順）
 * 1. 支出の登録 2. 支出一覧 3. 精算のまとめ 4. 集金 5. 返金 6. 家族ごとの明細
 */
@Component({
  selector: 'app-accounting-page',
  imports: [MatButtonModule, MatIconModule, YenPipe, CheckList, ExpenseForm],
  templateUrl: './accounting-page.html',
  styleUrl: './accounting-page.scss',
})
export class AccountingPage {
  protected readonly store = inject(RoomStore);
  private readonly expenseService = inject(ExpenseService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly snackBar = inject(MatSnackBar);

  /** 精算の結果 */
  protected readonly result = this.store.settlementResult;

  /** 編集中の支出のID */
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** 支出の合計 */
  protected readonly expenseTotal = computed(() => this.result().expenseTotal);

  /** 集金の一覧：全家族 */
  protected readonly collectionRows = computed<CheckRow[]>(() =>
    this.result().families.map((row) => ({ family: row.family, amount: row.collectAmount })),
  );

  /**
   * 返金の一覧：立替のある家族だけ。
   * （立替がなくなっても、返金チェック済みなら警告を出すために残す）
   */
  protected readonly refundRows = computed<CheckRow[]>(() =>
    this.result()
      .families.filter((row) => row.refundAmount > 0 || row.family.refundCheck !== null)
      .map((row) => ({
        family: row.family,
        amount: row.refundAmount,
        note: row.refundDetails
          .map((detail) => `${detail.label} ¥${detail.amount.toLocaleString('ja-JP')}`)
          .join('、'),
      })),
  );

  async add(input: ExpenseInput): Promise<void> {
    const myFamilyId = this.store.currentFamilyId();
    if (!myFamilyId) {
      return;
    }
    await this.run(() => this.expenseService.addExpense(this.store.roomId(), input, myFamilyId));
  }

  async update(expense: Expense, input: ExpenseInput): Promise<void> {
    await this.run(async () => {
      await this.expenseService.updateExpense(this.store.roomId(), expense.id, input);
      this.editingId.set(null);
    });
  }

  async remove(expense: Expense): Promise<void> {
    const name = expense.description || this.categoryLabel(expense);
    if (!(await this.confirmDialog.confirmDelete(name))) {
      return;
    }
    await this.run(() => this.expenseService.deleteExpense(this.store.roomId(), expense.id));
  }

  protected categoryLabel(expense: Expense): string {
    return EXPENSE_CATEGORIES.find((category) => category.key === expense.category)?.label ?? '';
  }

  protected toInput(expense: Expense): ExpenseInput {
    const { payerFamilyId, amount, category, description } = expense;
    return { payerFamilyId, amount, category, description };
  }

  /** 差引の表示（+¥1,000 / −¥500 / ¥0） */
  protected signedYen(value: number): string {
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}¥${Math.abs(value).toLocaleString('ja-JP')}`;
  }

  private async run(task: () => Promise<void>): Promise<void> {
    this.saving.set(true);
    try {
      await task();
    } catch (error) {
      console.error('保存できませんでした', error);
      this.snackBar.open('保存できませんでした。もう一度お試しください', undefined, {
        duration: 3000,
        panelClass: 'above-tab-bar',
      });
    } finally {
      this.saving.set(false);
    }
  }
}
