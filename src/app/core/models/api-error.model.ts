import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorBody {
  readonly code: string;
  readonly description: string;
}

export interface ApiBusinessErrorResponse {
  readonly error: ApiErrorBody;
}

export interface ApiValidationErrorResponse {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly validationErrors?: Record<string, string[]>;

  constructor(
    message: string,
    options: {
      status: number;
      code: string;
      validationErrors?: Record<string, string[]>;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.validationErrors = options.validationErrors;
  }
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError('An unexpected error occurred.', {
      status: 0,
      code: 'Client.UnknownError',
    });
  }

  const body = error.error;

  if (body && typeof body === 'object' && 'error' in body) {
    const businessError = body as ApiBusinessErrorResponse;
    return new ApiError(businessError.error.description, {
      status: error.status,
      code: businessError.error.code,
    });
  }

  if (body && typeof body === 'object' && 'errors' in body) {
    const validationError = body as ApiValidationErrorResponse;
    const firstField = validationError.errors
      ? Object.keys(validationError.errors)[0]
      : undefined;
    const firstMessage =
      firstField && validationError.errors?.[firstField]?.[0]
        ? validationError.errors[firstField][0]
        : validationError.detail ?? validationError.title ?? 'Validation failed.';

    return new ApiError(firstMessage, {
      status: error.status,
      code: 'Validation.Error',
      validationErrors: validationError.errors,
    });
  }

  if (body && typeof body === 'object' && 'detail' in body) {
    const problem = body as { detail?: string; title?: string; type?: string };
    const message = problem.detail ?? problem.title ?? error.message;

    return new ApiError(message || 'Request failed.', {
      status: error.status,
      code: problem.type ?? `Http.${error.status}`,
    });
  }

  return new ApiError(error.message || 'Request failed.', {
    status: error.status,
    code: `Http.${error.status}`,
  });
}
