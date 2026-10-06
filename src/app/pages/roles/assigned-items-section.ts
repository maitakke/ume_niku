import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { AssignedItemInput, ItemService } from '../../core/item.service';
import { RoomStore } from '../../core/room.store';
import { AssignedItem } from '../../models/item';
import { AssignedItemForm } from './assigned-item-form';

/** 役割分担タブの「食材」「持ち寄り」の欄 */
@Component({
  selector: 'app-assigned-items-section',
  imports: [MatButtonModule, MatIconModule, AssignedItemForm],
  templateUrl: './assigned-items-section.html',
  styleUrl: './assigned-items-section.scss',
})
export class AssignedItemsSection {
  protected readonly store = inject(RoomStore);
  private readonly itemService = inject(ItemService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly snackBar = inject(MatSnackBar);

  /** どちらの欄か（食材 / 持ち寄り） */
  readonly category = input.required<'food' | 'bring'>();

  /** この欄の品目 */
  protected readonly items = computed(() =>
    (this.store.items() ?? []).filter(
      (item): item is AssignedItem => item.category === this.category(),
    ),
  );

  /** 担当が未定の件数 */
  protected readonly undecidedCount = computed(
    () => this.items().filter((item) => this.isUndecided(item)).length,
  );

  /** 編集中の品目のID */
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** 担当が「未定」か（担当の家族が削除された場合も未定として扱う） */
  protected isUndecided(item: AssignedItem): boolean {
    return (
      item.assigneeFamilyId === null ||
      !(this.store.families() ?? []).some((family) => family.id === item.assigneeFamilyId)
    );
  }

  async add(input: AssignedItemInput): Promise<void> {
    await this.runSaving(() =>
      this.itemService.addAssignedItem(this.store.roomId(), this.category(), input),
    );
  }

  async update(item: AssignedItem, input: AssignedItemInput): Promise<void> {
    await this.runSaving(async () => {
      await this.itemService.updateAssignedItem(this.store.roomId(), item.id, input);
      this.editingId.set(null);
    });
  }

  async remove(item: AssignedItem): Promise<void> {
    if (!(await this.confirmDialog.confirmDelete(item.name))) {
      return;
    }
    await this.runSaving(() => this.itemService.deleteItem(this.store.roomId(), item.id));
  }

  protected toInput(item: AssignedItem): AssignedItemInput {
    return {
      name: item.name,
      assigneeFamilyId: this.isUndecided(item) ? null : item.assigneeFamilyId,
      quantityText: item.quantityText,
    };
  }

  private async runSaving(task: () => Promise<void>): Promise<void> {
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
