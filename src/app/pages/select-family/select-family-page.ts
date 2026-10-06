import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoomStore } from '../../core/room.store';
import { FamilyService } from '../../core/family.service';
import { notBlank } from '../../shared/validators';

/** 「あなたはどの家族ですか？」画面：家族を選ぶ、または新しく追加する */
@Component({
  selector: 'app-select-family-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './select-family-page.html',
  styleUrl: './select-family-page.scss',
})
export class SelectFamilyPage {
  protected readonly store = inject(RoomStore);
  private readonly familyService = inject(FamilyService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  /** 新しい家族の名前の入力欄 */
  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [notBlank, Validators.maxLength(30)],
  });

  /** 入力フォーム（<form [formGroup]> に結びつけると、送信時にページが再読み込みされない） */
  readonly form = new FormGroup({ name: this.nameControl });

  /** 追加中かどうか（ボタンの二度押しを防ぐ） */
  readonly adding = signal(false);

  /** 家族を選んで、グループのダッシュボードへ進む */
  async select(familyId: string): Promise<void> {
    this.store.selectFamily(familyId);
    await this.router.navigate(['/r', this.store.roomId(), 'dashboard']);
  }

  /** 新しい家族を追加して、その家族を選ぶ */
  async addFamily(): Promise<void> {
    const name = this.nameControl.value.trim();
    if (this.nameControl.invalid || this.adding()) {
      return;
    }
    // 同じ名前の家族がすでにあれば、追加せずに知らせる
    if (this.store.families()?.some((family) => family.name === name)) {
      this.snackBar.open(`「${name}」はすでにあります。上の一覧から選んでください`, undefined, {
        duration: 3000,
      });
      return;
    }
    this.adding.set(true);
    try {
      const familyId = await this.familyService.addFamily(this.store.roomId(), name);
      await this.select(familyId);
    } catch (error) {
      console.error('家族を追加できませんでした', error);
      this.snackBar.open('家族を追加できませんでした。もう一度お試しください', undefined, {
        duration: 3000,
      });
      this.adding.set(false);
    }
  }
}
