import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexPlotOptions,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

import { CountryFailureCountDto, LoginTrendPointDto } from '../models/security.model';

export type SecurityBarChartView = {
  readonly series: ApexAxisChartSeries;
  readonly chart: ApexChart;
  readonly xaxis: ApexXAxis;
  readonly yaxis: ApexYAxis;
  readonly dataLabels: ApexDataLabels;
  readonly plotOptions: ApexPlotOptions;
  readonly tooltip: ApexTooltip;
  readonly legend: ApexLegend;
  readonly grid: ApexGrid;
};

const AXIS_LABEL_STYLE = { style: { colors: 'var(--admin-text-secondary)', fontSize: '11px' } };

function baseChart(stacked: boolean, height: number): ApexChart {
  return {
    type: 'bar',
    height,
    stacked,
    toolbar: { show: false },
    fontFamily: 'inherit',
    background: 'transparent',
    sparkline: { enabled: false },
  };
}

const COMPACT_LEGEND: ApexLegend = {
  show: true,
  position: 'top',
  horizontalAlign: 'right',
  fontSize: '12px',
  itemMargin: { horizontal: 8, vertical: 0 },
  markers: { size: 6 },
  labels: { colors: 'var(--admin-text-secondary)' },
};

const COMPACT_GRID: ApexGrid = {
  borderColor: 'var(--admin-border-subtle)',
  strokeDashArray: 3,
  padding: { top: -8, right: 4, bottom: 0, left: 4 },
};

/** Stacked successful-vs-failed logins per day, for the Overview tab's "logins over time" chart. */
export function buildLoginTrendChart(points: readonly LoginTrendPointDto[]): SecurityBarChartView {
  return {
    series: [
      { name: 'Successful', data: points.map((p) => p.successfulLogins), color: '#22c55e' },
      { name: 'Failed', data: points.map((p) => p.failedLogins), color: '#ef4444' },
    ],
    chart: baseChart(true, 200),
    xaxis: { categories: points.map((p) => p.date), labels: AXIS_LABEL_STYLE, axisBorder: { show: false } },
    yaxis: { labels: AXIS_LABEL_STYLE },
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } },
    tooltip: { theme: 'dark' },
    legend: COMPACT_LEGEND,
    grid: COMPACT_GRID,
  };
}

/**
 * Top countries by failed-login count (last 7 days). No longer rendered on the Overview tab (a
 * compact ranked list reads faster there than a chart for 3-5 items), kept as a chart-config
 * option for any future consumer that wants the bar-chart presentation of the same data.
 */
export function buildTopFailureCountriesChart(items: readonly CountryFailureCountDto[]): SecurityBarChartView {
  return {
    series: [{ name: 'Failed logins', data: items.map((i) => i.failedLogins), color: '#ef4444' }],
    chart: baseChart(false, 220),
    xaxis: { categories: items.map((i) => i.countryCode), labels: AXIS_LABEL_STYLE },
    yaxis: { labels: AXIS_LABEL_STYLE },
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', horizontal: true } },
    tooltip: { theme: 'dark' },
    legend: { show: false },
    grid: COMPACT_GRID,
  };
}
