import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { App } from './app';
import { AuthService } from './core/auth.service';

describe('App', () => {
  beforeEach(async () => {
    // テストでは本物の Firebase につながず、サインイン済みのふりをする偽物を使う
    const fakeAuthService = {
      uid: signal('test-uid'),
      errorMessage: signal<string | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: AuthService, useValue: fakeAuthService }],
    }).compileComponents();
  });

  it('アプリが作成できる', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('サインイン済みのユーザーIDを表示する', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ユーザーID test-uid');
  });
});
