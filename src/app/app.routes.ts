import { Routes } from '@angular/router';
import { familySelectedGuard } from './core/family-selected.guard';
import { HomePage } from './pages/home/home-page';
import { RoomPage } from './pages/room/room-page';
import { CreatedPage } from './pages/created/created-page';
import { SelectFamilyPage } from './pages/select-family/select-family-page';
import { RoomTabsLayout } from './pages/room-tabs/room-tabs-layout';
import { NotFoundPage } from './pages/not-found/not-found-page';

/**
 * 画面とURLの対応表
 *
 * /                         トップ（グループ作成）
 * /r/:roomId/created        作成完了（共有URLのコピー）
 * /r/:roomId/select-family  どの家族ですか？
 * /r/:roomId/dashboard など  グループ内のタブ（家族を選んでいないと select-family へ）
 *
 * タブの中身は loadComponent で「開いたときに読み込む」ようにして、最初の表示を軽くしている
 */
export const routes: Routes = [
  { path: '', component: HomePage, title: 'うめにくBBQ' },
  {
    // RoomPage がグループのデータを読み込み、中の画面に共有する
    path: 'r/:roomId',
    component: RoomPage,
    children: [
      { path: 'created', component: CreatedPage, title: 'グループを作りました' },
      { path: 'select-family', component: SelectFamilyPage, title: 'どの家族ですか？' },
      {
        path: '',
        component: RoomTabsLayout,
        canActivate: [familySelectedGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
            title: 'ダッシュボード',
          },
          {
            path: 'families',
            loadComponent: () =>
              import('./pages/families/families-page').then((m) => m.FamiliesPage),
            title: '家族',
          },
          {
            path: 'roles',
            loadComponent: () => import('./pages/roles/roles-page').then((m) => m.RolesPage),
            title: '役割分担',
          },
          {
            path: 'accounting',
            loadComponent: () =>
              import('./pages/accounting/accounting-page').then((m) => m.AccountingPage),
            title: '会計',
          },
        ],
      },
    ],
  },
  { path: '**', component: NotFoundPage, title: 'ページが見つかりません' },
];
