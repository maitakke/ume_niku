import { Component, OnInit, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAX_PEOPLE_PER_CATEGORY, PERSON_CATEGORIES, PersonCategory } from '../../constants';
import { FamilyInput } from '../../core/family.service';
import { CountStepper } from '../../shared/count-stepper';

/** 家族の入力フォーム（追加と編集の両方で使う） */
@Component({
  selector: 'app-family-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, CountStepper],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>家族の名前</mat-label>
        <input matInput formControlName="name" placeholder="例：田中家" maxlength="30" />
      </mat-form-field>

      <!-- 区分ごとの人数（－／＋で入力） -->
      @for (category of categories; track category.key) {
        <div class="count-row">
          <span class="count-label">{{ category.label }}</span>
          <app-count-stepper
            [value]="counts()[category.key]"
            [max]="maxPeople"
            [label]="category.label + 'の人数'"
            (valueChange)="setCount(category.key, $event)"
          />
        </div>
      }

      <mat-form-field appearance="outline" class="full-width memo">
        <mat-label>メモ（任意）</mat-label>
        <input matInput formControlName="memo" placeholder="例：車で来ます" maxlength="200" />
      </mat-form-field>

      <div class="actions">
        <button mat-stroked-button type="button" class="big-button" (click)="cancel.emit()">
          キャンセル
        </button>
        <button
          mat-flat-button
          type="submit"
          class="big-button"
          [disabled]="!form.controls.name.value.trim() || saving()"
        >
          {{ submitLabel() }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .count-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0;
    }

    .count-label {
      font-weight: 700;
    }

    .memo {
      margin-top: 12px;
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
export class FamilyForm implements OnInit {
  /** 編集するときの元の値（追加のときは null） */
  readonly initial = input<FamilyInput | null>(null);
  /** 保存ボタンの文字 */
  readonly submitLabel = input('保存');
  /** 保存中かどうか（親から渡す。二度押しを防ぐ） */
  readonly saving = input(false);
  /** 保存ボタンが押されたら、入力内容を知らせる */
  readonly save = output<FamilyInput>();
  /** キャンセルが押されたら知らせる */
  readonly cancel = output<void>();

  protected readonly categories = PERSON_CATEGORIES;
  protected readonly maxPeople = MAX_PEOPLE_PER_CATEGORY;

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    memo: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
  });

  /** 区分ごとの人数 */
  protected readonly counts = signal<Record<PersonCategory, number>>({
    adults: 0,
    students: 0,
    preschoolers: 0,
    infants: 0,
  });

  ngOnInit(): void {
    // 編集のときは、元の値を入力欄に入れておく
    const initial = this.initial();
    if (initial) {
      this.form.setValue({ name: initial.name, memo: initial.memo });
      this.counts.set({
        adults: initial.adults,
        students: initial.students,
        preschoolers: initial.preschoolers,
        infants: initial.infants,
      });
    }
  }

  protected setCount(key: PersonCategory, value: number): void {
    this.counts.update((counts) => ({ ...counts, [key]: value }));
  }

  protected submit(): void {
    const name = this.form.controls.name.value.trim();
    if (!name || this.form.invalid) {
      return;
    }
    this.save.emit({ name, memo: this.form.controls.memo.value.trim(), ...this.counts() });
  }
}
