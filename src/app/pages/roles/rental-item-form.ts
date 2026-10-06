import { Component, OnInit, input, output, signal, viewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAX_RENTAL_QUANTITY, MAX_UNIT_PRICE, SPLIT_TYPE_LABELS } from '../../constants';
import { RentalItemInput } from '../../core/item.service';
import { SplitType } from '../../models/item';
import { CountStepper } from '../../shared/count-stepper';
import { notBlank } from '../../shared/validators';

/** レンタル品のフォームが知らせる内容（分け方つき） */
export interface RentalItemFormValue extends RentalItemInput {
  splitType: SplitType;
}

/** レンタル品の入力フォーム（追加と編集の両方で使う。分け方は追加のときだけ選べる） */
@Component({
  selector: 'app-rental-item-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, CountStepper],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>何を？</mat-label>
        <input matInput formControlName="name" placeholder="例：焼き台、椅子" maxlength="50" />
        <mat-error>品名を入力してください</mat-error>
      </mat-form-field>

      <!-- 分け方（追加のときだけ選べる。あとから変更はできない） -->
      @if (initial()) {
        <p class="split-fixed">分け方：{{ splitLabels[splitType()] }}</p>
      } @else {
        <div class="segmented split" role="radiogroup" aria-label="分け方">
          @for (type of splitTypes; track type) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="splitType() === type"
              [class.on]="splitType() === type"
              (click)="splitType.set(type)"
            >
              {{ splitLabels[type] }}
            </button>
          }
        </div>
        <p class="split-help">
          @if (splitType() === 'shared') {
            焼き台・テントなど、みんなで使うもの。全員で割って負担します。
          } @else {
            椅子など、家庭ごとに数が違うもの。各家族が自分の数を入力し、その分を負担します。
          }
        </p>
      }

      <div class="row">
        <mat-form-field appearance="outline" class="price">
          <mat-label>単価（円）</mat-label>
          <input
            matInput
            type="number"
            inputmode="numeric"
            formControlName="unitPrice"
            min="0"
            [max]="maxUnitPrice"
          />
          <mat-error>0〜{{ maxUnitPrice.toLocaleString() }}円の整数で入力してください</mat-error>
        </mat-form-field>

        @if (splitType() === 'shared') {
          <div class="quantity">
            <span class="quantity-label">数量</span>
            <app-count-stepper
              [value]="quantity()"
              [max]="maxQuantity"
              label="数量"
              (valueChange)="quantity.set($event)"
            />
          </div>
        }
      </div>

      <div class="actions">
        @if (showCancel()) {
          <button mat-stroked-button type="button" class="big-button" (click)="cancel.emit()">
            キャンセル
          </button>
        }
        <button
          mat-flat-button
          type="submit"
          class="big-button"
          [disabled]="form.invalid || saving()"
        >
          {{ submitLabel() }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .split {
      margin-bottom: 4px;
    }

    .split-help,
    .split-fixed {
      margin: 0 0 12px;
      color: var(--color-text-sub);
      font-size: 0.8rem;
    }

    .row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .price {
      flex: 1;
      min-width: 0;
    }

    .quantity {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .quantity-label {
      color: var(--color-text-sub);
      font-size: 0.8rem;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .actions button {
      flex: 1;
    }
  `,
})
export class RentalItemForm implements OnInit {
  /** 編集するときの元の値（追加のときは null） */
  readonly initial = input<RentalItemFormValue | null>(null);
  readonly submitLabel = input('追加');
  readonly showCancel = input(false);
  readonly saving = input(false);
  readonly save = output<RentalItemFormValue>();
  readonly cancel = output<void>();

  protected readonly splitTypes: SplitType[] = ['shared', 'perFamily'];
  protected readonly splitLabels = SPLIT_TYPE_LABELS;
  protected readonly maxUnitPrice = MAX_UNIT_PRICE;
  protected readonly maxQuantity = MAX_RENTAL_QUANTITY;

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(50)],
    }),
    // 単価は 0 以上の整数（金額は円の整数で扱う）
    unitPrice: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(MAX_UNIT_PRICE),
      Validators.pattern(/^\d+$/),
    ]),
  });

  /** <form [formGroup]> の本体（送信済みの状態をリセットするために使う） */
  private readonly formDirective = viewChild.required(FormGroupDirective);

  /** 分け方 */
  protected readonly splitType = signal<SplitType>('shared');
  /** 数量（全体で割るときだけ使う） */
  protected readonly quantity = signal(1);

  ngOnInit(): void {
    const initial = this.initial();
    if (initial) {
      this.form.setValue({ name: initial.name, unitPrice: initial.unitPrice });
      this.splitType.set(initial.splitType);
      this.quantity.set(initial.quantity);
    }
  }

  protected submit(): void {
    const name = this.form.controls.name.value.trim();
    const unitPrice = this.form.controls.unitPrice.value;
    if (this.form.invalid || unitPrice === null) {
      return;
    }
    this.save.emit({
      name,
      unitPrice: Number(unitPrice),
      quantity: this.quantity(),
      splitType: this.splitType(),
    });
    // 追加フォームのときは、続けて入力できるよう空に戻す（赤いエラー表示にならないよう resetForm を使う）
    if (!this.initial()) {
      this.formDirective().resetForm();
      this.quantity.set(1);
    }
  }
}
