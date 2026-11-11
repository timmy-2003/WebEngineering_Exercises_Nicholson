const PROBLEMS = 'https://bears.example/problems';

const HTTP_NOT_FOUND = 404;
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
}

export class NotFoundError extends AppError {
  readonly status = HTTP_NOT_FOUND;
  readonly type = `${PROBLEMS}/not-found`;
  readonly title = 'Resource not found';

  constructor(resource: string, id: string) {
    super(`No ${resource} with id "${id}" exists.`);
  }
}

export class UpstreamError extends AppError {
  readonly status = HTTP_BAD_GATEWAY;
  readonly type = `${PROBLEMS}/upstream`;
  readonly title = 'Upstream unavailable';
}

export class UpstreamTimeoutError extends AppError {
  readonly status = HTTP_GATEWAY_TIMEOUT;
  readonly type = `${PROBLEMS}/upstream-timeout`;
  readonly title = 'Upstream timeout';
}

export class UpstreamThrottledError extends AppError {
  readonly status = HTTP_SERVICE_UNAVAILABLE;
  readonly type = `${PROBLEMS}/upstream-throttled`;
  readonly title = 'Upstream throttled';

  constructor(
    message: string,
    readonly retryAfterSeconds: number
  ) {
    super(message);
  }
}
