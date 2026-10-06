import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      // URLの :roomId を、コンポーネントの input() で受け取れるようにする
      withComponentInputBinding(),
      // 子の画面でも、親のURLにある :roomId を読めるようにする
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),

    // Firebase の初期化（どのプロジェクトにつなぐか）
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),

    // アプリ起動時に匿名サインインを済ませてから、画面を表示する
    provideAppInitializer(() => inject(AuthService).ensureSignedIn()),
  ],
};
