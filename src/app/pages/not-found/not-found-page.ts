import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

/** 存在しないURLを開いたときの画面 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, MatButtonModule],
  template: `
    <main class="page">
      <div class="card center-box">
        <h1>ページが見つかりません</h1>
        <p>URLが正しいか確認してください。</p>
        <a mat-stroked-button routerLink="/" class="big-button">トップページへ</a>
      </div>
    </main>
  `,
})
export class NotFoundPage {}
