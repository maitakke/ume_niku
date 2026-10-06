import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, map, of, switchMap } from 'rxjs';
import { RoomService } from './room.service';
import { FamilyService } from './family.service';
import { CurrentFamilyService } from './current-family.service';

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
  private readonly currentFamilyService = inject(CurrentFamilyService);

  /** 開いているグループのID */
  readonly roomId = signal('');

  /** roomId が決まったら流れる Observable（空文字のあいだは何もしない） */
  private readonly roomId$ = toObservable(this.roomId).pipe(filter((id) => id !== ''));

  /** グループ。読み込み中は undefined、見つからなければ null */
  readonly room = toSignal(this.roomId$.pipe(switchMap((id) => this.roomService.watchRoom(id))));

  /** 家族の一覧。読み込み中は undefined（グループが見つからないときは空） */
  readonly families = toSignal(
    this.roomId$.pipe(
      switchMap((id) =>
        this.roomService.watchRoom(id).pipe(
          map((room) => room !== null),
          distinctUntilChanged(),
          // グループが存在するときだけ、家族の一覧を読みに行く
          switchMap((exists) => (exists ? this.familyService.watchFamilies(id) : of([]))),
        ),
      ),
    ),
  );

  /** この端末で選ばれている家族のID */
  readonly currentFamilyId = signal<string | null>(null);

  /** この端末で選ばれている家族（一覧に見つからなければ null） */
  readonly currentFamily = computed(() => {
    const id = this.currentFamilyId();
    return this.families()?.find((family) => family.id === id) ?? null;
  });

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
}
