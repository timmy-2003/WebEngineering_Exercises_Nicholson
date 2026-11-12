import type { Bear, BearDetail } from '../bears/bear';
import type { Comment, CommentDraft } from '../comments/comment';
import { API_BASE_URL } from './api-base-url';

export interface FieldError {
  path: string;
  message: string;
}

export interface ProblemInfo {
  title: string;
  detail: string;
  requestId?: string;
  errors?: readonly FieldError[];
}

export class ApiError extends Error {
  readonly title: string;
  readonly detail: string;
  readonly requestId: string | undefined;
  readonly errors: readonly FieldError[];

  constructor(
    readonly status: number,
    info: ProblemInfo
  ) {
    const { title, detail, requestId, errors = [] } = info;
    super(detail);
    this.name = 'ApiError';
    this.title = title;
    this.detail = detail;
    this.requestId = requestId;
    this.errors = errors;
  }
}

export function userMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) {
    return fallback;
  }
  const fields = err.errors.map((field) => field.message).join('; ');
  const reference =
    err.requestId === undefined ? '' : ` (reference: ${err.requestId})`;
  return `${err.detail}${fields === '' ? '' : ` ${fields}.`}${reference}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFieldError(value: unknown): value is FieldError {
  return (
    isObject(value) &&
    typeof value['path'] === 'string' &&
    typeof value['message'] === 'string'
  );
}

function stringField(body: unknown, key: string): string | undefined {
  if (!isObject(body)) {
    return undefined;
  }
  const { [key]: value } = body;
  return typeof value === 'string' ? value : undefined;
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
  const requestId =
    res.headers.get('x-request-id') ??
    stringField(body, 'instance')?.replace(/^urn:uuid:/v, '');
  const errors =
    isObject(body) && Array.isArray(body['errors'])
      ? body['errors'].filter(isFieldError)
      : [];
  return new ApiError(res.status, {
    title: stringField(body, 'title') ?? res.statusText,
    detail: stringField(body, 'detail') ?? `Request failed (${res.status})`,
    requestId,
    errors,
  });
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res;
}

async function getJson(path: string, signal: AbortSignal): Promise<unknown> {
  return await (await send(path, { signal })).json();
}

function isComment(value: unknown): value is Comment {
  return (
    isObject(value) &&
    typeof value['id'] === 'string' &&
    typeof value['bearId'] === 'string' &&
    typeof value['author'] === 'string' &&
    typeof value['text'] === 'string' &&
    typeof value['createdAt'] === 'string'
  );
}

function unexpectedShape(path: string): ApiError {
  return new ApiError(0, {
    title: 'Unexpected response',
    detail: `The server sent an unexpected response for ${path}.`,
  });
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

const commentsPath = (bearId: string): string =>
  `/api/bears/${encodeURIComponent(bearId)}/comments`;

export async function getComments(
  bearId: string,
  signal: AbortSignal
): Promise<Comment[]> {
  const path = commentsPath(bearId);
  const body = await getJson(path, signal);
  if (
    !isObject(body) ||
    !Array.isArray(body['items']) ||
    !body['items'].every(isComment)
  ) {
    throw unexpectedShape(path);
  }
  return body['items'];
}

export async function postComment(
  bearId: string,
  draft: CommentDraft
): Promise<Comment> {
  const path = commentsPath(bearId);
  const res = await send(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  const body: unknown = await res.json();
  if (!isComment(body)) {
    throw unexpectedShape(path);
  }
  return body;
}

export async function deleteComment(id: string): Promise<void> {
  await send(`/api/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
