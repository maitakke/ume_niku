import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoomService } from '../../core/room.service';
import { notBlank } from '../../shared/validators';

/** トップページ：グループ名を入力して新しいグループを作る */
@Component({
  selector: 'app-home-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly roomService = inject(RoomService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  /** グループ名の入力欄 */
  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [notBlank, Validators.maxLength(50)],
  });

  /** 入力フォーム（<form [formGroup]> に結びつけると、送信時にページが再読み込みされない） */
  readonly form = new FormGroup({ name: this.nameControl });

  /** 作成中かどうか（ボタンの二度押しを防ぐ） */
  readonly creating = signal(false);

  async createRoom(): Promise<void> {
    const name = this.nameControl.value.trim();
    if (this.nameControl.invalid || this.creating()) {
      return;
    }
    this.creating.set(true);
    try {
      const roomId = await this.roomService.createRoom(name);
      await this.router.navigate(['/r', roomId, 'created']);
    } catch (error) {
      console.error('グループを作れませんでした', error);
      this.snackBar.open('グループを作れませんでした。もう一度お試しください', undefined, {
        duration: 3000,
      });
      this.creating.set(false);
    }
  }
}
