import type { Bear, BearDetail } from '../bears/bear';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail: string,
    readonly requestId?: string
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBear(value: unknown): value is Bear {
  return (
    isObject(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['binomial'] === 'string' &&
    typeof value['range'] === 'string' &&
    (value['imageUrl'] === null || typeof value['imageUrl'] === 'string')
  );
}

function isBearDetail(value: unknown): value is BearDetail {
  return isObject(value) && typeof value['intro'] === 'string' && isBear(value);
}

async function toApiError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => null);
  const requestId = res.headers.get('x-request-id') ?? undefined;
  const title =
    isObject(body) && typeof body['title'] === 'string'
      ? body['title']
      : res.statusText;
  const detail =
    isObject(body) && typeof body['detail'] === 'string'
      ? body['detail']
      : `Request failed (${res.status})`;
  return new ApiError(res.status, title, detail, requestId);
}

async function getJson(path: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(path, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return await res.json();
}

function unexpectedShape(path: string): ApiError {
  return new ApiError(
    0,
    'Unexpected response',
    `The server sent an unexpected response for ${path}.`
  );
}

export async function getBears(signal: AbortSignal): Promise<Bear[]> {
  const path = '/api/bears';
  const body = await getJson(path, signal);
  if (
    !isObject(body) ||
    !Array.isArray(body['items']) ||
    !body['items'].every(isBear)
  ) {
    throw unexpectedShape(path);
  }
  return body['items'];
}

export async function getBear(
  id: string,
  signal: AbortSignal
): Promise<BearDetail> {
  const path = `/api/bears/${encodeURIComponent(id)}`;
  const body = await getJson(path, signal);
  if (!isBearDetail(body)) {
    throw unexpectedShape(path);
  }
  return body;
}
