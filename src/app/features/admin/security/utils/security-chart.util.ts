import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexPlotOptions, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';

import { CountryFailureCountDto, LoginTrendPointDto } from '../models/security.model';

export type SecurityBarChartView = {
  readonly series: ApexAxisChartSeries;
  readonly chart: ApexChart;
  readonly xaxis: ApexXAxis;
  readonly yaxis: ApexYAxis;
  readonly dataLabels: ApexDataLabels;
  readonly plotOptions: ApexPlotOptions;
  readonly tooltip: ApexTooltip;
};

const AXIS_LABEL_STYLE = { style: { colors: 'var(--admin-text-secondary)' } };

function baseChart(stacked: boolean): ApexChart {
  return {
    type: 'bar',
    height: 300,
    stacked,
    toolbar: { show: false },
    fontFamily: 'inherit',
    background: 'transparent',
  };
}

/** Stacked successful-vs-failed logins per day, for the Overview tab's "logins over time" chart. */
export function buildLoginTrendChart(points: readonly LoginTrendPointDto[]): SecurityBarChartView {
  return {
    series: [
      { name: 'Successful', data: points.map((p) => p.successfulLogins), color: '#22c55e' },
      { name: 'Failed', data: points.map((p) => p.failedLogins), color: '#ef4444' },
    ],
    chart: baseChart(true),
    xaxis: { categories: points.map((p) => p.date), labels: AXIS_LABEL_STYLE },
    yaxis: { labels: AXIS_LABEL_STYLE },
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    tooltip: { theme: 'dark' },
  };
}

/** Top countries by failed-login count (last 7 days), for the Overview tab. */
export function buildTopFailureCountriesChart(items: readonly CountryFailureCountDto[]): SecurityBarChartView {
  return {
    series: [{ name: 'Failed logins', data: items.map((i) => i.failedLogins), color: '#ef4444' }],
    chart: baseChart(false),
    xaxis: { categories: items.map((i) => i.countryCode), labels: AXIS_LABEL_STYLE },
    yaxis: { labels: AXIS_LABEL_STYLE },
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', horizontal: true } },
    tooltip: { theme: 'dark' },
  };
}
