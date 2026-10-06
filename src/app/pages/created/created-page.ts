import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RoomStore } from '../../core/room.store';
import { ShareService } from '../../core/share.service';

/** グループ作成後の画面：共有URLの表示とコピー */
@Component({
  selector: 'app-created-page',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './created-page.html',
  styleUrl: './created-page.scss',
})
export class CreatedPage {
  protected readonly store = inject(RoomStore);
  private readonly shareService = inject(ShareService);

  /** 共有URL */
  readonly roomUrl = computed(() => this.shareService.roomUrl(this.store.roomId()));

  copyUrl(): void {
    this.shareService.copyRoomUrl(this.store.roomId());
  }
}
