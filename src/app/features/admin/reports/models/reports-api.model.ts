export type ReportPeriodPreset =
  | 'Today'
  | 'Yesterday'
  | 'Last7'
  | 'Last30'
  | 'Last90'
  | 'ThisMonth'
  | 'ThisYear'
  | 'Custom';

export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json';

export type ReportScheduleFrequency = 'Daily' | 'Weekly' | 'Monthly';

export type ReportExecutionStatus =
  | 'Pending'
  | 'Running'
  | 'Succeeded'
  | 'Failed'
  | 'Skipped';

export type ReportExecutionTrigger = 'Manual' | 'Schedule';

export interface ReportFilterState {
  readonly preset: ReportPeriodPreset;
  readonly from: string | null;
  readonly to: string | null;
}

export const DEFAULT_REPORT_FILTERS: ReportFilterState = {
  preset: 'Last30',
  from: null,
  to: null,
};

export const REPORT_FORMATS: ReportFormat[] = ['pdf', 'xlsx', 'csv', 'json'];

export const REPORT_FREQUENCIES: ReportScheduleFrequency[] = ['Daily', 'Weekly', 'Monthly'];

export interface ReportTypeInfo {
  readonly type: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly supportedFormats: readonly string[];
}

export interface ReportDefinition {
  readonly id: string;
  readonly name: string;
  readonly reportType: string;
  readonly filtersJson: string | null;
  readonly formatDefault: string;
  readonly isSystem: boolean;
  readonly createdByUserId: string | null;
  readonly createdOnUtc: string;
  readonly modifiedOnUtc: string | null;
  readonly isFavorite: boolean;
}

export interface ReportDownload {
  readonly id: string;
  readonly userId: string;
  readonly reportType: string;
  readonly format: string;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly createdOnUtc: string;
  readonly correlationId: string | null;
}

export interface ScheduledReport {
  readonly id: string;
  readonly reportDefinitionId: string | null;
  readonly reportType: string;
  readonly filtersJson: string | null;
  readonly format: string;
  readonly frequency: ReportScheduleFrequency | string;
  readonly emailRecipients: readonly string[];
  readonly isEnabled: boolean;
  readonly nextRunOnUtc: string | null;
  readonly lastRunOnUtc: string | null;
  readonly createdByUserId: string | null;
  readonly createdOnUtc: string;
}

export interface ScheduledReportExecution {
  readonly id: string;
  readonly scheduledReportId: string;
  readonly status: ReportExecutionStatus | string;
  readonly startedOnUtc: string;
  readonly finishedOnUtc: string | null;
  readonly error: string | null;
  readonly downloadId: string | null;
  readonly triggeredBy: ReportExecutionTrigger | string;
}

export interface CreateReportDefinitionRequest {
  readonly name: string;
  readonly reportType: string;
  readonly filtersJson?: string | null;
  readonly formatDefault?: string | null;
}

export interface CreateScheduledReportRequest {
  readonly reportType: string;
  readonly filtersJson?: string | null;
  readonly format?: string | null;
  readonly frequency?: string | null;
  readonly emailRecipients?: readonly string[] | null;
  readonly isEnabled: boolean;
  readonly reportDefinitionId?: string | null;
}

export interface UpdateScheduledReportRequest {
  readonly filtersJson?: string | null;
  readonly format?: string | null;
  readonly frequency?: string | null;
  readonly emailRecipients?: readonly string[] | null;
  readonly isEnabled: boolean;
}