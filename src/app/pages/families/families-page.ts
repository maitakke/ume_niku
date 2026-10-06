import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PERSON_CATEGORIES } from '../../constants';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { FamilyInput, FamilyService } from '../../core/family.service';
import { RoomStore } from '../../core/room.store';
import { SettlementService } from '../../core/settlement.service';
import { Family } from '../../models/family';
import { FamilyForm } from './family-form';

/** 家族タブ：全体の集計、家族の追加・編集・削除 */
@Component({
  selector: 'app-families-page',
  imports: [MatButtonModule, MatIconModule, FamilyForm],
  templateUrl: './families-page.html',
  styleUrl: './families-page.scss',
})
export class FamiliesPage {
  protected readonly store = inject(RoomStore);
  protected readonly settlement = inject(SettlementService);
  private readonly familyService = inject(FamilyService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly categories = PERSON_CATEGORIES;

  /** 追加フォームを開いているか */
  protected readonly adding = signal(false);
  /** 編集中の家族のID（編集していなければ null） */
  protected readonly editingId = signal<string | null>(null);
  /** 保存中かどうか */
  protected readonly saving = signal(false);

  /** 家族を追加する */
  async add(input: FamilyInput): Promise<void> {
    if (this.isDuplicateName(input.name, null)) {
      return;
    }
    await this.runSaving(async () => {
      await this.familyService.addFamilyWithDetails(this.store.roomId(), input);
      this.adding.set(false);
    });
  }

  /** 家族を編集する */
  async update(family: Family, input: FamilyInput): Promise<void> {
    if (this.isDuplicateName(input.name, family.id)) {
      return;
    }
    await this.runSaving(async () => {
      await this.familyService.updateFamily(this.store.roomId(), family.id, input);
      this.editingId.set(null);
    });
  }

  /**
   * 家族を削除する。
   * - 立て替えた支出がある／レンタル代を支払った家族になっている／家庭ごとレンタルの数量が入っている
   *   → 削除できない（理由を表示）
   * - 食材・持ち寄りの担当になっている → 確認のうえ、担当を「未定」に戻して削除
   */
  async remove(family: Family): Promise<void> {
    const roomId = this.store.roomId();
    const items = this.store.items() ?? [];

    // 削除できない理由を集める
    const reasons: string[] = [];
    if (this.store.room()?.rentalPayerFamilyId === family.id) {
      reasons.push('・レンタル代を支払った家族になっています（役割分担タブ → レンタルで変更できます）');
    }
    const rentalNames = items
      .filter(
        (item) =>
          item.category === 'rental' &&
          item.splitType === 'perFamily' &&
          this.settlement.familyQuantity(item, family.id) > 0,
      )
      .map((item) => `「${item.name}」`);
    if (rentalNames.length > 0) {
      reasons.push(`・家庭ごとのレンタル品${rentalNames.join('')}の数量が入っています（0にしてください）`);
    }
    try {
      if (await this.familyService.hasExpenses(roomId, family.id)) {
        reasons.push('・立て替えた支出が登録されています（会計タブで確認できます）');
      }
    } catch (error) {
      console.error('支出を確認できませんでした', error);
      this.showMessage('削除できるか確認できませんでした。通信環境を確認してください');
      return;
    }
    if (reasons.length > 0) {
      await this.confirmDialog.alert(`「${family.name}」は削除できません`, reasons.join('\n'));
      return;
    }

    // 担当している品目は「未定」に戻す
    const assignedItemIds = items
      .filter((item) => item.category !== 'rental' && item.assigneeFamilyId === family.id)
      .map((item) => item.id);
    const notes = [];
    if (assignedItemIds.length > 0) {
      notes.push(`担当している${assignedItemIds.length}件は「未定」に戻ります。`);
    }
    if (family.id === this.store.currentFamilyId()) {
      notes.push('あなたの家族です。削除すると、家族を選び直す画面に移ります。');
    }
    notes.push('この操作は取り消せません。');
    if (!(await this.confirmDialog.confirmDelete(family.name, notes.join('\n')))) {
      return;
    }
    try {
      await this.familyService.deleteFamily(roomId, family.id, assignedItemIds);
    } catch (error) {
      console.error('家族を削除できませんでした', error);
      this.showMessage('削除できませんでした。もう一度お試しください');
    }
  }

  /** 編集フォームに渡す、家族の今の値 */
  protected toInput(family: Family): FamilyInput {
    const { name, adults, students, preschoolers, infants, memo } = family;
    return { name, adults, students, preschoolers, infants, memo };
  }

  /** 同じ名前の家族がほかにあれば知らせて true を返す */
  private isDuplicateName(name: string, selfId: string | null): boolean {
    const duplicate = (this.store.families() ?? []).some(
      (family) => family.name === name && family.id !== selfId,
    );
    if (duplicate) {
      this.showMessage(`「${name}」はすでにあります。別の名前にしてください`);
    }
    return duplicate;
  }

  /** 保存中の表示をしながら処理し、失敗したら知らせる */
  private async runSaving(task: () => Promise<void>): Promise<void> {
    this.saving.set(true);
    try {
      await task();
    } catch (error) {
      console.error('保存できませんでした', error);
      this.showMessage('保存できませんでした。もう一度お試しください');
    } finally {
      this.saving.set(false);
    }
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000, panelClass: 'above-tab-bar' });
  }
}
