import { STATUS_CODES } from 'node:http';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import type { Problem } from './schemas/problem.js';

const PROBLEMS = 'https://bears.example/problems';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_UNSUPPORTED_MEDIA_TYPE = 415;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_GATEWAY_TIMEOUT = 504;

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly type: string;
  abstract readonly title: string;

  override get name(): string {
    return this.constructor.name;
  }

  abstract readonly publicDetail: string;
}

export class NotFoundError extends AppError {
  readonly status = HTTP_NOT_FOUND;
  readonly type = `${PROBLEMS}/not-found`;
  readonly title = 'Resource not found';

  constructor(resource: string, id: string) {
    super(`No ${resource} with id "${id}" exists.`);
  }

  get publicDetail(): string {
    return this.message;
  }
}

export class RouteNotFoundError extends AppError {
  readonly status = HTTP_NOT_FOUND;
  readonly type = `${PROBLEMS}/not-found`;
  readonly title = 'Resource not found';

  constructor(method: string, url: string) {
    super(`No route ${method} ${url}.`);
  }

  get publicDetail(): string {
    return this.message;
  }
}

export class UpstreamError extends AppError {
  readonly status = HTTP_BAD_GATEWAY;
  readonly type = `${PROBLEMS}/upstream`;
  readonly title = 'Upstream unavailable';
  readonly publicDetail = 'The bear data source could not be reached.';
}

export class UpstreamTimeoutError extends AppError {
  readonly status = HTTP_GATEWAY_TIMEOUT;
  readonly type = `${PROBLEMS}/upstream-timeout`;
  readonly title = 'Upstream timeout';
  readonly publicDetail = 'The bear data source did not answer in time.';
}

export class UpstreamThrottledError extends AppError {
  readonly status = HTTP_SERVICE_UNAVAILABLE;
  readonly type = `${PROBLEMS}/upstream-throttled`;
  readonly title = 'Upstream throttled';
  readonly publicDetail =
    'The bear data source is busy. Please try again later.';

  constructor(
    message: string,
    readonly retryAfterSeconds: number
  ) {
    super(message);
  }
}

export class InvalidCursorError extends AppError {
  readonly status = HTTP_BAD_REQUEST;
  readonly type = `${PROBLEMS}/validation`;
  readonly title = 'Invalid request';
  readonly publicDetail =
    'The cursor is invalid. Start again from the first page.';
}

export class DatabaseUnavailableError extends AppError {
  readonly status = HTTP_SERVICE_UNAVAILABLE;
  readonly type = `${PROBLEMS}/database-unavailable`;
  readonly title = 'Database unavailable';
  readonly publicDetail = 'The database cannot be reached right now.';
}

function statusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('statusCode' in err)) {
    return undefined;
  }
  const { statusCode } = err;
  return typeof statusCode === 'number' ? statusCode : undefined;
}

export function toProblem(err: unknown, requestId: string): Problem {
  const instance = `urn:uuid:${requestId}`;

  if (err instanceof AppError) {
    return {
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.publicDetail,
      instance,
    };
  }

  if (hasZodFastifySchemaValidationErrors(err)) {
    return {
      type: `${PROBLEMS}/validation`,
      title: 'Invalid request',
      status: HTTP_BAD_REQUEST,
      detail: 'The request could not be accepted. See errors for details.',
      instance,
      errors: err.validation.map((issue) => ({
        path: issue.instancePath.replace(/^\//v, '').replaceAll('/', '.'),
        message: issue.message ?? 'Invalid value',
      })),
    };
  }

  return clientProblem(err, instance) ?? internalProblem(instance);
}

function clientProblem(err: unknown, instance: string): Problem | null {
  const status = statusOf(err);
  if (status === HTTP_UNSUPPORTED_MEDIA_TYPE) {
    return {
      type: `${PROBLEMS}/unsupported-media-type`,
      title: 'Unsupported media type',
      status,
      detail: 'Send the request body as application/json.',
      instance,
    };
  }
  if (
    status !== undefined &&
    status >= HTTP_BAD_REQUEST &&
    status < HTTP_INTERNAL_SERVER_ERROR
  ) {
    return {
      type:
        status === HTTP_BAD_REQUEST ? `${PROBLEMS}/validation` : 'about:blank',
      title:
        status === HTTP_BAD_REQUEST
          ? 'Invalid request'
          : (STATUS_CODES[status] ?? 'Client error'),
      status,
      detail:
        err instanceof Error
          ? err.message
          : 'The request could not be accepted.',
      instance,
    };
  }
  return null;
}

function internalProblem(instance: string): Problem {
  return {
    type: `${PROBLEMS}/internal`,
    title: 'Internal server error',
    status: HTTP_INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred.',
    instance,
  };
}
