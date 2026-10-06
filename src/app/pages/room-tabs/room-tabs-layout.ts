import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RoomStore } from '../../core/room.store';
import { ShareService } from '../../core/share.service';

/** 下のタブに並べる画面の一覧 */
const TABS = [
  { path: 'dashboard', label: 'ダッシュボード', icon: 'home' },
  { path: 'families', label: '家族', icon: 'groups' },
  { path: 'roles', label: '役割分担', icon: 'checklist' },
  { path: 'accounting', label: '会計', icon: 'payments' },
];

/**
 * グループ内の画面の枠組み。
 * 上：グループ名・参加中の家族・URLをコピー／下：タブ
 */
@Component({
  selector: 'app-room-tabs-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  templateUrl: './room-tabs-layout.html',
  styleUrl: './room-tabs-layout.scss',
})
export class RoomTabsLayout {
  protected readonly store = inject(RoomStore);
  private readonly shareService = inject(ShareService);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;

  constructor() {
    // 記憶していた家族が削除されていたら、家族を選び直してもらう
    effect(() => {
      const families = this.store.families();
      if (families !== undefined && this.store.currentFamily() === null) {
        this.router.navigate(['/r', this.store.roomId(), 'select-family']);
      }
    });
  }

  copyUrl(): void {
    this.shareService.copyRoomUrl(this.store.roomId());
  }
}
