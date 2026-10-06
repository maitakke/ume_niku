import { Routes } from '@angular/router';
import { familySelectedGuard } from './core/family-selected.guard';
import { HomePage } from './pages/home/home-page';
import { RoomPage } from './pages/room/room-page';
import { CreatedPage } from './pages/created/created-page';
import { SelectFamilyPage } from './pages/select-family/select-family-page';
import { RoomTabsLayout } from './pages/room-tabs/room-tabs-layout';
import { DashboardPage } from './pages/dashboard/dashboard-page';
import { FamiliesPage } from './pages/families/families-page';
import { RolesPage } from './pages/roles/roles-page';
import { AccountingPage } from './pages/accounting/accounting-page';
import { NotFoundPage } from './pages/not-found/not-found-page';

/**
 * 画面とURLの対応表
 *
 * /                         トップ（グループ作成）
 * /r/:roomId/created        作成完了（共有URLのコピー）
 * /r/:roomId/select-family  どの家族ですか？
 * /r/:roomId/dashboard など  グループ内のタブ（家族を選んでいないと select-family へ）
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
          { path: 'dashboard', component: DashboardPage, title: 'ダッシュボード' },
          { path: 'families', component: FamiliesPage, title: '家族' },
          { path: 'roles', component: RolesPage, title: '役割分担' },
          { path: 'accounting', component: AccountingPage, title: '会計' },
        ],
      },
    ],
  },
  { path: '**', component: NotFoundPage, title: 'ページが見つかりません' },
];
