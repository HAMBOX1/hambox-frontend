export interface OperationsDashboardDto {
  jobs: OperationsJobMetricsDto;
  orders: OperationsOrderMetricsDto;
  inventory: OperationsInventoryMetricsDto;
  suppliers: OperationsSupplierMetricsDto;
  api: OperationsApiMetricsDto;
  recentAlerts: OperationalAlertDto[];
  worker: WorkerRuntimeStateDto;
  timings: OperationsTimingMetricsDto;
}

export interface OperationsJobMetricsDto {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  retrying: number;
  cancelled: number;
  total: number;
}

export interface OperationsOrderMetricsDto {
  waitingDelivery: number;
  delivered: number;
  failed: number;
  processing: number;
}

export interface OperationsInventoryMetricsDto {
  activeReservations: number;
  expiredReservations: number;
  lowStockVariants: number;
  outOfStockVariants: number;
}

export interface OperationsSupplierMetricsDto {
  active: number;
  inactive: number;
  total: number;
}

export interface OperationsApiMetricsDto {
  errorsLastHour: number;
  errorsLast24Hours: number;
  requestsLastHour: number;
  averageDurationMsLastHour: number;
}

export interface OperationsTimingMetricsDto {
  averageJobProcessingSeconds: number | null;
  averageDeliverySeconds: number | null;
}

export interface WorkerRuntimeStateDto {
  workerId: string;
  isRunning: boolean;
  lastHeartbeatUtc: string | null;
  lastTickUtc: string | null;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  heartbeatAgeSeconds: number | null;
}

export interface OperationalJobDto {
  id: string;
  jobType: string;
  status: string;
  priority: string;
  queue: string;
  progressPercent: number;
  attempts: number;
  maxAttempts: number;
  workerId: string | null;
  correlationId: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  lastError: string | null;
  createdOnUtc: string;
  startedOnUtc: string | null;
  finishedOnUtc: string | null;
  nextVisibleOnUtc: string | null;
  lastRetryOnUtc: string | null;
  durationSeconds: number | null;
}

export interface BackgroundJobExecutionHistoryDto {
  id: string;
  attemptNumber: number;
  status: string;
  startedOnUtc: string;
  finishedOnUtc: string | null;
  durationMs: number | null;
  exception: string | null;
  workerId: string | null;
  correlationId: string | null;
}

export interface RecurringJobDefinitionDto {
  key: string;
  jobType: string;
  queue: string;
  priority: string;
  intervalMinutes: number;
  lastEnqueuedOnUtc: string | null;
}

export interface DeliveryMonitorItemDto {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
  itemsCount: number;
  keysDelivered: number;
  createdOnUtc: string;
  lastKeyDeliveredOnUtc: string | null;
}

export interface SupplierOperationsItemDto {
  id: string;
  companyName: string;
  status: string;
  country: string | null;
  currency: string;
  email: string | null;
  createdOnUtc: string;
  modifiedOnUtc: string | null;
  recentAuditCount: number;
}

export interface ApiRequestLogDto {
  id: string;
  timestampUtc: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  correlationId: string | null;
  userId: string | null;
  ipAddress: string | null;
  requestSizeBytes: number | null;
  responseSizeBytes: number | null;
  exception: string | null;
}

export interface OperationalAlertDto {
  id: string;
  code: string;
  title: string;
  message: string;
  severity: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdOnUtc: string;
  isAcknowledged: boolean;
  acknowledgedOnUtc: string | null;
  acknowledgedByUserId: string | null;
}

export interface SystemHealthDto {
  overallStatus: string;
  checkedOnUtc: string;
  components: SystemHealthComponentDto[];
}

export interface SystemHealthComponentDto {
  name: string;
  status: string;
  detail: string | null;
  latencyMs: number | null;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
