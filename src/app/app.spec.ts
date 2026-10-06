import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth.service';

describe('App', () => {
  // テストでは本物の Firebase につながず、偽物の AuthService を使う
  const errorMessage = signal<string | null>(null);

  beforeEach(async () => {
    errorMessage.set(null);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { uid: signal('test-uid'), errorMessage } },
      ],
    }).compileComponents();
  });

  it('アプリが作成できる', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('サインインに失敗したときはエラーを表示する', () => {
    errorMessage.set('サーバーに接続できませんでした。');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('サーバーに接続できませんでした。');
  });
});
