import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { ArcElement, ChartConfiguration, DoughnutController, Tooltip } from 'chart.js';
import { PERSON_CATEGORIES } from '../../constants';
import { RoomStore } from '../../core/room.store';
import { YenPipe } from '../../shared/yen.pipe';

/**
 * 支出のカテゴリごとの色（食材・飲み物・備品・会場・その他の順）。
 * 隣り合う色が見分けやすい順に並べてある（色覚の多様性も確認済み）。
 * 色だけに頼らないよう、グラフの横に名前・金額・割合の一覧も表示する。
 */
const CATEGORY_COLORS = ['#12A594', '#C98A0E', '#3B82D6', '#E0604A', '#8B5CD6'];

/** ダッシュボード：全体の状況をひと目で見る */
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, MatIconModule, BaseChartDirective, YenPipe],
  // グラフ（Chart.js）は、使う部品（ドーナツ型・ツールチップ）だけを登録する。
  // ここで登録すると、ダッシュボードを開いたときだけ読み込まれる
  providers: [provideCharts({ registerables: [DoughnutController, ArcElement, Tooltip] })],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly store = inject(RoomStore);
  protected readonly categories = PERSON_CATEGORIES;

  /** 支出のカテゴリ別（グラフと一覧用。金額が0のカテゴリは除く） */
  protected readonly expenseSlices = computed(() => {
    const total = this.store.settlementResult().expenseTotal;
    return this.store
      .expenseByCategory()
      .map((category, index) => ({ ...category, color: CATEGORY_COLORS[index] }))
      .filter((category) => category.amount > 0)
      .map((category) => ({
        ...category,
        percent: total > 0 ? Math.round((category.amount / total) * 100) : 0,
      }));
  });

  /** 円グラフ（ドーナツ型）のデータ */
  protected readonly chartData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const slices = this.expenseSlices();
    return {
      labels: slices.map((slice) => slice.label),
      datasets: [
        {
          data: slices.map((slice) => slice.amount),
          backgroundColor: slices.map((slice) => slice.color),
          // 区切りの白い線（2px）
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  });

  /** 円グラフの設定 */
  protected readonly chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '62%',
    plugins: {
      legend: { display: false }, // 凡例はグラフの横に自分で表示する
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}：¥${Number(context.raw).toLocaleString('ja-JP')}`,
        },
      },
    },
  };

  /** 集金の進捗（0〜100%） */
  protected readonly collectionPercent = computed(() => {
    const { collectedAmount, totalAmount } = this.store.collectionProgress();
    return totalAmount > 0 ? Math.min(100, Math.round((collectedAmount / totalAmount) * 100)) : 0;
  });
}
