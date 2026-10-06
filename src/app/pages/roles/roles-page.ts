import { Component, signal } from '@angular/core';
import { ITEM_CATEGORY_LABELS } from '../../constants';
import { ItemCategory } from '../../models/item';
import { AssignedItemsSection } from './assigned-items-section';
import { RentalSection } from './rental-section';

/** 役割分担タブ：食材／持ち寄り／レンタル を切り替えて表示する */
@Component({
  selector: 'app-roles-page',
  imports: [AssignedItemsSection, RentalSection],
  template: `
    <h1>役割分担</h1>

    <!-- カテゴリの切り替え -->
    <div class="segmented" role="tablist" aria-label="カテゴリ">
      @for (category of categories; track category) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="selected() === category"
          [class.on]="selected() === category"
          (click)="selected.set(category)"
        >
          {{ labels[category] }}
        </button>
      }
    </div>

    @switch (selected()) {
      @case ('food') {
        <app-assigned-items-section category="food" />
      }
      @case ('bring') {
        <app-assigned-items-section category="bring" />
      }
      @case ('rental') {
        <app-rental-section />
      }
    }
  `,
  styles: `
    .segmented {
      margin-bottom: 16px;
    }
  `,
})
export class RolesPage {
  protected readonly categories: ItemCategory[] = ['food', 'bring', 'rental'];
  protected readonly labels = ITEM_CATEGORY_LABELS;

  /** 表示中のカテゴリ */
  protected readonly selected = signal<ItemCategory>('food');
}
