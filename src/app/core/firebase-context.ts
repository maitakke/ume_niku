import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';

/**
 * AngularFire の関数を「注入コンテキスト」の中で呼ぶための道具。
 *
 * AngularFire の関数（addDoc, collectionData など）は、ボタンを押したときなど
 * 注入コンテキストの外で呼ぶと、開発中のコンソールに警告が出る。
 * サービスの中でこの道具を通して呼ぶと、警告が出ず、画面の更新も正しく行われる。
 *
 * 使い方（サービスの中で）：
 *   private readonly inFirebaseContext = injectFirebaseContext();
 *   this.inFirebaseContext(() => addDoc(...));
 */
export function injectFirebaseContext() {
  const injector = inject(EnvironmentInjector);
  return <T>(fn: () => T): T => runInInjectionContext(injector, fn);
}
