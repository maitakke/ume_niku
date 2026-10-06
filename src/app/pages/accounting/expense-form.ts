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
import { MatSelectModule } from '@angular/material/select';
import { EXPENSE_CATEGORIES, ExpenseCategory, MAX_EXPENSE_AMOUNT } from '../../constants';
import { ExpenseInput } from '../../core/expense.service';
import { Family } from '../../models/family';

/** 支出の入力フォーム（登録と編集の両方で使う） */
@Component({
  selector: 'app-expense-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>立て替えた家族</mat-label>
        <mat-select formControlName="payerFamilyId">
          @for (family of families(); track family.id) {
            <mat-option [value]="family.id">{{ family.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>金額（円）</mat-label>
        <input
          matInput
          type="number"
          inputmode="numeric"
          formControlName="amount"
          min="1"
          [max]="maxAmount"
          placeholder="例：3000"
        />
        @if (form.controls.amount.invalid && form.controls.amount.touched) {
          <mat-error>1〜{{ maxAmount.toLocaleString() }}の整数</mat-error>
        }
      </mat-form-field>

      <!-- カテゴリ（押して選ぶ） -->
      <div class="chips" role="radiogroup" aria-label="カテゴリ">
        @for (category of categories; track category.key) {
          <button
            type="button"
            role="radio"
            class="chip"
            [attr.aria-checked]="selectedCategory() === category.key"
            [class.on]="selectedCategory() === category.key"
            (click)="selectedCategory.set(category.key)"
          >
            {{ category.label }}
          </button>
        }
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>内容</mat-label>
        <input matInput formControlName="description" placeholder="例：お肉、炭" maxlength="50" />
      </mat-form-field>

      <div class="actions">
        @if (showCancel()) {
          <button mat-stroked-button type="button" class="big-button" (click)="cancel.emit()">
            キャンセル
          </button>
        }
        <button mat-flat-button type="submit" class="big-button" [disabled]="form.invalid || saving()">
          {{ submitLabel() }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .chip {
      min-height: 44px;
      padding: 0 16px;
      border: 2px solid var(--color-line);
      border-radius: var(--radius-pill);
      background: var(--color-surface);
      color: var(--color-text-sub);
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
    }

    .chip.on {
      border-color: var(--color-main);
      background: var(--color-main-soft);
      color: var(--color-main-text);
      font-weight: 900;
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
export class ExpenseForm implements OnInit {
  /** 立て替えた家族として選べる家族 */
  readonly families = input.required<Family[]>();
  /** 「立て替えた家族」の初期値（登録のときは自分の家族） */
  readonly defaultPayerId = input<string | null>(null);
  /** 編集するときの元の値（登録のときは null） */
  readonly initial = input<ExpenseInput | null>(null);
  readonly submitLabel = input('登録');
  readonly showCancel = input(false);
  readonly saving = input(false);
  readonly save = output<ExpenseInput>();
  readonly cancel = output<void>();

  protected readonly categories = EXPENSE_CATEGORIES;
  protected readonly maxAmount = MAX_EXPENSE_AMOUNT;

  /** <form [formGroup]> の本体（送信済みの状態をリセットするために使う） */
  private readonly formDirective = viewChild.required(FormGroupDirective);

  protected readonly form = new FormGroup({
    payerFamilyId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    // 金額は 1円以上の整数
    amount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(MAX_EXPENSE_AMOUNT),
      Validators.pattern(/^\d+$/),
    ]),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
  });

  /** 選ばれているカテゴリ */
  protected readonly selectedCategory = signal<ExpenseCategory>('food');

  ngOnInit(): void {
    const initial = this.initial();
    if (initial) {
      this.form.setValue({
        payerFamilyId: initial.payerFamilyId,
        amount: initial.amount,
        description: initial.description,
      });
      this.selectedCategory.set(initial.category);
    } else {
      this.form.controls.payerFamilyId.setValue(this.defaultPayerId() ?? '');
    }
  }

  protected submit(): void {
    const { payerFamilyId, amount, description } = this.form.getRawValue();
    if (this.form.invalid || amount === null) {
      return;
    }
    this.save.emit({
      payerFamilyId,
      amount: Number(amount),
      category: this.selectedCategory(),
      description: description.trim(),
    });
    // 登録フォームのときは、続けて入力できるよう金額と内容を空にする（家族とカテゴリはそのまま）
    if (!this.initial()) {
      this.formDirective().resetForm({ payerFamilyId, amount: null, description: '' });
    }
  }
}
