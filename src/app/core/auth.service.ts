import { Injectable, inject, signal } from '@angular/core';
import { Auth, signInAnonymously } from '@angular/fire/auth';
import { injectFirebaseContext } from './firebase-context';

/**
 * 匿名認証を担当するサービス。
 * 利用者にはログイン画面を見せず、アプリ起動時に自動でサインインする。
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly inFirebaseContext = injectFirebaseContext();

  /** サインイン中のユーザーID（まだなら null） */
  readonly uid = signal<string | null>(null);

  /** サインインに失敗したときのメッセージ（成功なら null） */
  readonly errorMessage = signal<string | null>(null);

  /**
   * サインイン済みの状態にする。
   * アプリ起動時に1回だけ呼ばれ、終わるまで画面の表示を待たせる（app.config.ts 参照）。
   * こうすることで「サインイン前に Firestore を読んでエラーになる」ことを防ぐ。
   */
  async ensureSignedIn(): Promise<void> {
    try {
      // 前回のサインイン情報がブラウザに残っていれば、その復元を待つ
      await this.auth.authStateReady();

      // 復元できなかったとき（初めて開いた端末など）だけ、新しく匿名サインインする
      const user =
        this.auth.currentUser ??
        (await this.inFirebaseContext(() => signInAnonymously(this.auth))).user;
      this.uid.set(user.uid);
    } catch (error) {
      console.error('匿名サインインに失敗しました', error);
      this.errorMessage.set(
        'サーバーに接続できませんでした。通信環境を確認して、ページを再読み込みしてください。',
      );
    }
  }
}
