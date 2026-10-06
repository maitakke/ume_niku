import { Component, effect, inject, input } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RoomStore } from '../../core/room.store';

/**
 * /r/:roomId の入れ物。
 * グループのデータを読み込み（RoomStore）、中の画面（作成完了・家族選択・タブ）に共有する。
 * グループが見つからないときは、エラーを表示する。
 */
@Component({
  selector: 'app-room-page',
  imports: [RouterOutlet, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  // RoomStore をこの画面ごとに1つ作る（中の画面はすべて同じものを使う）
  providers: [RoomStore],
  templateUrl: './room-page.html',
})
export class RoomPage {
  protected readonly store = inject(RoomStore);

  /** URL の :roomId */
  readonly roomId = input.required<string>();

  constructor() {
    // URL の roomId が変わったら、そのグループを読み込む
    effect(() => this.store.open(this.roomId()));
  }
}
