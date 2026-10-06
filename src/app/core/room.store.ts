import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, distinctUntilChanged, filter, map, of, switchMap } from 'rxjs';
import { RoomService } from './room.service';
import { FamilyService } from './family.service';
import { ItemService } from './item.service';
import { ExpenseService } from './expense.service';
import { CurrentFamilyService } from './current-family.service';
import { SettlementService } from './settlement.service';
import { EXPENSE_CATEGORIES, FAMILY_COLORS } from '../constants';
import { Family } from '../models/family';
import { AssignedItem, Item } from '../models/item';
import { Expense } from '../models/expense';

/**
 * 開いているグループのデータを、画面どうしで共有するための入れ物。
 *
 * - RoomPage（/r/:roomId）で1つ作られ、その中のすべての画面（タブなど）から使える
 * - Firestore の購読はここで1回だけ行い、変更はリアルタイムで Signal に反映される
 */
@Injectable()
export class RoomStore {
  private readonly roomService = inject(RoomService);
  private readonly familyService = inject(FamilyService);
  private readonly itemService = inject(ItemService);
  private readonly expenseService = inject(ExpenseService);
  private readonly currentFamilyService = inject(CurrentFamilyService);
  private readonly settlement = inject(SettlementService);

  /** 開いているグループのID */
  readonly roomId = signal('');

  /** roomId が決まったら流れる Observable（空文字のあいだは何もしない） */
  private readonly roomId$ = toObservable(this.roomId).pipe(filter((id) => id !== ''));

  /** グループ。読み込み中は undefined、見つからなければ null */
  readonly room = toSignal(this.roomId$.pipe(switchMap((id) => this.roomService.watchRoom(id))));

  /** 家族の一覧。読み込み中は undefined（グループが見つからないときは空） */
  readonly families = toSignal(
    this.whenRoomExists((id) => this.familyService.watchFamilies(id), [] as Family[]),
  );

  /** 役割分担の一覧。読み込み中は undefined（グループが見つからないときは空） */
  readonly items = toSignal(
    this.whenRoomExists((id) => this.itemService.watchItems(id), [] as Item[]),
  );

  /** 支出の一覧。読み込み中は undefined（グループが見つからないときは空） */
  readonly expenses = toSignal(
    this.whenRoomExists((id) => this.expenseService.watchExpenses(id), [] as Expense[]),
  );

  /** この端末で選ばれている家族のID */
  readonly currentFamilyId = signal<string | null>(null);

  /** この端末で選ばれている家族（一覧に見つからなければ null） */
  readonly currentFamily = computed(() => {
    const id = this.currentFamilyId();
    return this.families()?.find((family) => family.id === id) ?? null;
  });

  /** 家族ID → 家族名 の対応表 */
  private readonly familyNames = computed(
    () => new Map((this.families() ?? []).map((family) => [family.id, family.name])),
  );

  /** 人数の集計（区分別・総合計・精算対象人数） */
  readonly peopleSummary = computed(() =>
    this.settlement.summarizePeople(this.families() ?? []),
  );

  /** レンタル品の集計（全体で割る分・家庭ごとの分・合計） */
  readonly rentalSummary = computed(() =>
    this.settlement.summarizeRentals(this.items() ?? [], this.families() ?? []),
  );

  /** 精算の結果（家族ごとの集金額・返金額など） */
  readonly settlementResult = computed(() =>
    this.settlement.settle({
      families: this.families() ?? [],
      items: this.items() ?? [],
      expenses: this.expenses() ?? [],
      rentalPayerFamilyId: this.room()?.rentalPayerFamilyId ?? null,
    }),
  );

  /** レンタル代を支払った家族（未定、または削除済みなら null） */
  readonly rentalPayer = computed(() => {
    const payerId = this.room()?.rentalPayerFamilyId;
    return this.families()?.find((family) => family.id === payerId) ?? null;
  });

  /** 食材・持ち寄りのうち、担当が未定の件数 */
  readonly undecidedItemCount = computed(
    () =>
      (this.items() ?? []).filter(
        (item) => item.category !== 'rental' && this.isUndecided(item),
      ).length,
  );

  /** 集金の進捗（集金済みの家族数・集まった金額） */
  readonly collectionProgress = computed(() => {
    const rows = this.settlementResult().families;
    const checked = rows.filter((row) => row.family.collectionCheck !== null);
    return {
      checkedCount: checked.length,
      totalCount: rows.length,
      // 集まった金額は、チェックしたときに記録した金額の合計
      collectedAmount: checked.reduce((sum, row) => sum + (row.family.collectionCheck?.amount ?? 0), 0),
      totalAmount: this.settlementResult().collectTotal,
    };
  });

  /** 支出のカテゴリ別の合計（カテゴリの並び順どおり） */
  readonly expenseByCategory = computed(() =>
    EXPENSE_CATEGORIES.map((category) => ({
      ...category,
      amount: (this.expenses() ?? [])
        .filter((expense) => expense.category === category.key)
        .reduce((sum, expense) => sum + expense.amount, 0),
    })),
  );

  /** 表示するグループを切り替える */
  open(roomId: string): void {
    this.roomId.set(roomId);
    this.currentFamilyId.set(this.currentFamilyService.get(roomId));
  }

  /** この端末の家族を選ぶ（端末に記憶する） */
  selectFamily(familyId: string): void {
    this.currentFamilyService.set(this.roomId(), familyId);
    this.currentFamilyId.set(familyId);
  }

  /** 家族IDから家族名を返す（未定なら「未定」、見つからなければ「削除された家族」） */
  familyName(familyId: string | null): string {
    if (familyId === null) {
      return '未定';
    }
    return this.familyNames().get(familyId) ?? '削除された家族';
  }

  /**
   * 家族ごとの色（家族の登録順に割り当てる）。見つからない家族は null。
   * ※ 家族を削除すると、それより後に登録した家族の色がずれる
   */
  familyColor(familyId: string | null): string | null {
    const index = (this.families() ?? []).findIndex((family) => family.id === familyId);
    return index < 0 ? null : FAMILY_COLORS[index % FAMILY_COLORS.length];
  }

  /** 食材・持ち寄りの担当が「未定」か（担当の家族が削除された場合も未定として扱う） */
  isUndecided(item: AssignedItem): boolean {
    return item.assigneeFamilyId === null || !this.familyNames().has(item.assigneeFamilyId);
  }

  /**
   * グループが存在するときだけ、配下のデータ（家族・品目など）を読みに行く。
   * 存在しないグループでは、読みに行かずに empty を流す。
   */
  private whenRoomExists<T>(watch: (roomId: string) => Observable<T>, empty: T): Observable<T> {
    return this.roomId$.pipe(
      switchMap((id) =>
        this.roomService.watchRoom(id).pipe(
          map((room) => room !== null),
          distinctUntilChanged(),
          switchMap((exists) => (exists ? watch(id) : of(empty))),
        ),
      ),
    );
  }
}
