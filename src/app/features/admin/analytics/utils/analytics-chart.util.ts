import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

import {
  AnalyticsNamedValueDto,
  AnalyticsSeriesPointDto,
} from '../models/analytics-api.model';

export type AnalyticsLineChartView = {
  readonly series: ApexAxisChartSeries;
  readonly chart: ApexChart;
  readonly xaxis: ApexXAxis;
  readonly yaxis: ApexYAxis;
  readonly stroke: ApexStroke;
  readonly dataLabels: ApexDataLabels;
  readonly tooltip: ApexTooltip;
  readonly fill?: ApexFill;
};

export type AnalyticsBarChartView = {
  readonly series: ApexAxisChartSeries;
  readonly chart: ApexChart;
  readonly xaxis: ApexXAxis;
  readonly yaxis: ApexYAxis;
  readonly dataLabels: ApexDataLabels;
  readonly plotOptions: ApexPlotOptions;
  readonly tooltip: ApexTooltip;
};

export type AnalyticsDonutChartView = {
  readonly series: ApexNonAxisChartSeries;
  readonly chart: ApexChart;
  readonly labels: string[];
  readonly colors: string[];
  readonly legend: ApexLegend;
  readonly dataLabels: ApexDataLabels;
  readonly tooltip: ApexTooltip;
  readonly plotOptions: ApexPlotOptions;
};

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

function baseChart(type: ApexChart['type'], height = 360): ApexChart {
  return {
    type,
    height,
    toolbar: { show: false },
    fontFamily: 'inherit',
    background: 'transparent',
  };
}

export function buildLineChart(
  points: readonly AnalyticsSeriesPointDto[],
  name: string,
  area = false,
): AnalyticsLineChartView {
  return {
    series: [{ name, data: points.map((p) => Number(p.value)) }],
    chart: baseChart(area ? 'area' : 'line'),
    xaxis: {
      categories: points.map((p) => p.label),
      labels: { style: { colors: 'var(--admin-text-secondary)' } },
    },
    yaxis: {
      labels: { style: { colors: 'var(--admin-text-secondary)' } },
    },
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    tooltip: { theme: 'dark' },
    fill: area
      ? {
          type: 'gradient',
          gradient: {
            shadeIntensity: 0.4,
            opacityFrom: 0.45,
            opacityTo: 0.05,
          },
        }
      : undefined,
  };
}

export function buildBarChart(
  points: readonly AnalyticsSeriesPointDto[],
  name: string,
): AnalyticsBarChartView {
  return {
    series: [{ name, data: points.map((p) => Number(p.value)) }],
    chart: baseChart('bar'),
    xaxis: {
      categories: points.map((p) => p.label),
      labels: { style: { colors: 'var(--admin-text-secondary)' } },
    },
    yaxis: {
      labels: { style: { colors: 'var(--admin-text-secondary)' } },
    },
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    tooltip: { theme: 'dark' },
  };
}

export function buildDonutChart(
  items: readonly AnalyticsNamedValueDto[],
): AnalyticsDonutChartView {
  return {
    series: items.map((i) => Number(i.value)),
    chart: baseChart('donut', 300),
    labels: items.map((i) => i.name),
    colors: CHART_COLORS,
    legend: { position: 'bottom' },
    dataLabels: { enabled: true },
    tooltip: { theme: 'dark' },
    plotOptions: {
      pie: {
        donut: { size: '65%' },
      },
    },
  };
}

export function buildNamedBarChart(
  items: readonly AnalyticsNamedValueDto[],
  name: string,
): AnalyticsBarChartView {
  return buildBarChart(
    items.map((i) => ({ label: i.name, value: i.value, count: i.count })),
    name,
  );
}