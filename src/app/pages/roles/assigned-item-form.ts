import { Component, OnInit, input, output, viewChild } from '@angular/core';
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
import { UNDECIDED } from '../../constants';
import { AssignedItemInput } from '../../core/item.service';
import { Family } from '../../models/family';
import { notBlank } from '../../shared/validators';

/** 食材・持ち寄り物品の入力フォーム（追加と編集の両方で使う） */
@Component({
  selector: 'app-assigned-item-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>何を？</mat-label>
        <input matInput formControlName="name" [placeholder]="namePlaceholder()" maxlength="50" />
        <mat-error>品名を入力してください</mat-error>
      </mat-form-field>

      <div class="row">
        <mat-form-field appearance="outline" class="assignee">
          <mat-label>誰が？</mat-label>
          <mat-select formControlName="assigneeFamilyId">
            <mat-option [value]="undecided">未定</mat-option>
            @for (family of families(); track family.id) {
              <mat-option [value]="family.id">{{ family.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="quantity">
          <mat-label>どのくらい？</mat-label>
          <input matInput formControlName="quantityText" placeholder="例：2kg" maxlength="30" />
        </mat-form-field>
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
    .row {
      display: flex;
      gap: 8px;
    }

    .assignee,
    .quantity {
      flex: 1;
      min-width: 0;
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
export class AssignedItemForm implements OnInit {
  /** 担当として選べる家族 */
  readonly families = input.required<Family[]>();
  /** 編集するときの元の値（追加のときは null） */
  readonly initial = input<AssignedItemInput | null>(null);
  /** 品名の入力例 */
  readonly namePlaceholder = input('');
  readonly submitLabel = input('追加');
  readonly showCancel = input(false);
  readonly saving = input(false);
  readonly save = output<AssignedItemInput>();
  readonly cancel = output<void>();

  /** 選択欄の「未定」 */
  protected readonly undecided = UNDECIDED;

  /** <form [formGroup]> の本体（送信済みの状態をリセットするために使う） */
  private readonly formDirective = viewChild.required(FormGroupDirective);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(50)],
    }),
    assigneeFamilyId: new FormControl(UNDECIDED, { nonNullable: true }),
    quantityText: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
  });

  ngOnInit(): void {
    const initial = this.initial();
    if (initial) {
      this.form.setValue({ ...initial, assigneeFamilyId: initial.assigneeFamilyId ?? UNDECIDED });
    }
  }

  protected submit(): void {
    const name = this.form.controls.name.value.trim();
    if (this.form.invalid) {
      return;
    }
    const assignee = this.form.controls.assigneeFamilyId.value;
    this.save.emit({
      name,
      assigneeFamilyId: assignee === UNDECIDED ? null : assignee,
      quantityText: this.form.controls.quantityText.value.trim(),
    });
    // 追加フォームのときは、続けて入力できるよう品名と数量を空にする（担当はそのまま）。
    // resetForm を使うと「送信済み」の状態も消え、空の入力欄が赤いエラー表示にならない
    if (!this.initial()) {
      this.formDirective().resetForm({ name: '', assigneeFamilyId: assignee, quantityText: '' });
    }
  }
}
