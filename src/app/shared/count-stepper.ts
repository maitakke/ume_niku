import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * －／＋ボタンで数を増やしたり減らしたりする部品。
 * 使い方：<app-count-stepper [value]="2" (valueChange)="..." />
 */
@Component({
  selector: 'app-count-stepper',
  imports: [MatIconModule],
  template: `
    <button
      type="button"
      class="step-button"
      [disabled]="disabled() || value() <= min()"
      (click)="valueChange.emit(value() - 1)"
      [attr.aria-label]="label() + 'を1減らす'"
    >
      <mat-icon>remove</mat-icon>
    </button>
    <span class="value" [attr.aria-label]="label()">{{ value() }}</span>
    <button
      type="button"
      class="step-button"
      [disabled]="disabled() || value() >= max()"
      (click)="valueChange.emit(value() + 1)"
      [attr.aria-label]="label() + 'を1増やす'"
    >
      <mat-icon>add</mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    // スマホで押しやすい 44px の丸ボタン
    .step-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 2px solid var(--color-main);
      border-radius: 50%;
      background: var(--color-surface);
      color: var(--color-main-text);
      cursor: pointer;
    }

    .step-button:disabled {
      border-color: var(--color-line);
      color: var(--color-line);
      cursor: default;
    }

    .value {
      min-width: 2.2em;
      font-size: 1.2rem;
      font-weight: 900;
      text-align: center;
    }
  `,
})
export class CountStepper {
  /** 今の値 */
  readonly value = input.required<number>();
  /** 最小値 */
  readonly min = input(0);
  /** 最大値 */
  readonly max = input(99);
  /** 押せなくするか */
  readonly disabled = input(false);
  /** 読み上げ用の名前（例：大人の人数） */
  readonly label = input('数');
  /** 値が変わったときに、新しい値を知らせる */
  readonly valueChange = output<number>();
}
