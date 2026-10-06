import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAX_RENTAL_QUANTITY, UNDECIDED } from '../../constants';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { ItemService } from '../../core/item.service';
import { RoomService } from '../../core/room.service';
import { RoomStore } from '../../core/room.store';
import { SettlementService } from '../../core/settlement.service';
import { PerFamilyRentalItem, RentalItem } from '../../models/item';
import { CountStepper } from '../../shared/count-stepper';
import { YenPipe } from '../../shared/yen.pipe';
import { RentalItemForm, RentalItemFormValue } from './rental-item-form';

/** 役割分担タブの「レンタル」の欄 */
@Component({
  selector: 'app-rental-section',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    CountStepper,
    YenPipe,
    RentalItemForm,
  ],
  templateUrl: './rental-section.html',
  styleUrl: './rental-section.scss',
})
export class RentalSection {
  protected readonly store = inject(RoomStore);
  protected readonly settlement = inject(SettlementService);
  private readonly itemService = inject(ItemService);
  private readonly roomService = inject(RoomService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly maxQuantity = MAX_RENTAL_QUANTITY;
  /** 選択欄の「未定」 */
  protected readonly undecided = UNDECIDED;

  /** レンタル品の一覧 */
  protected readonly items = computed(() =>
    (this.store.items() ?? []).filter((item): item is RentalItem => item.category === 'rental'),
  );

  /** レンタル代を支払った家族のID（未定、または削除された家族なら null） */
  protected readonly payerId = computed(() => this.store.rentalPayer()?.id ?? null);

  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** レンタル代を支払った家族を変更する（選択欄の「未定」は null として保存する） */
  async setPayer(value: string): Promise<void> {
    const familyId = value === UNDECIDED ? null : value;
    await this.run(() => this.roomService.setRentalPayer(this.store.roomId(), familyId));
  }

  async add(value: RentalItemFormValue): Promise<void> {
    await this.run(() => this.itemService.addRentalItem(this.store.roomId(), value.splitType, value));
  }

  async update(item: RentalItem, value: RentalItemFormValue): Promise<void> {
    await this.run(async () => {
      await this.itemService.updateRentalItem(this.store.roomId(), item.id, item.splitType, value);
      this.editingId.set(null);
    });
  }

  async remove(item: RentalItem): Promise<void> {
    if (!(await this.confirmDialog.confirmDelete(item.name))) {
      return;
    }
    await this.run(() => this.itemService.deleteItem(this.store.roomId(), item.id));
  }

  /**
   * 自分の家族の数量を変える（＋／－ボタン）。
   * 自分の家族のキーだけを更新するので、他の家族が同時に押しても上書きし合わない。
   */
  async setMyQuantity(item: PerFamilyRentalItem, quantity: number): Promise<void> {
    const familyId = this.store.currentFamilyId();
    if (!familyId || quantity < 0 || quantity > MAX_RENTAL_QUANTITY) {
      return;
    }
    try {
      await this.itemService.setFamilyQuantity(this.store.roomId(), item.id, familyId, quantity);
    } catch (error) {
      console.error('数量を保存できませんでした', error);
      this.showError();
    }
  }

  /** 編集フォームに渡す、品目の今の値 */
  protected toFormValue(item: RentalItem): RentalItemFormValue {
    return {
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.splitType === 'shared' ? item.quantity : 0,
      splitType: item.splitType,
    };
  }

  private async run(task: () => Promise<void>): Promise<void> {
    this.saving.set(true);
    try {
      await task();
    } catch (error) {
      console.error('保存できませんでした', error);
      this.showError();
    } finally {
      this.saving.set(false);
    }
  }

  private showError(): void {
    this.snackBar.open('保存できませんでした。もう一度お試しください', undefined, {
      duration: 3000,
      panelClass: 'above-tab-bar',
    });
  }
}
