import { z } from 'zod';

export const ProblemFieldError = z.object({
  path: z.string(),
  message: z.string(),
});

export const Problem = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string(),
    instance: z.string(),
    errors: z.array(ProblemFieldError).optional(),
  })
  .meta({ id: 'Problem', description: 'RFC 9457 Problem Details' });
export type Problem = z.infer<typeof Problem>;

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_UNSUPPORTED_MEDIA_TYPE = 415;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_GATEWAY_TIMEOUT = 504;

const PROBLEM_RESPONSES = {
  validation: [HTTP_BAD_REQUEST, 'Invalid request (validation)'],
  'not-found': [HTTP_NOT_FOUND, 'Resource not found'],
  'unsupported-media-type': [
    HTTP_UNSUPPORTED_MEDIA_TYPE,
    'Body is not application/json',
  ],
  internal: [HTTP_INTERNAL_SERVER_ERROR, 'Internal error'],
  upstream: [HTTP_BAD_GATEWAY, 'Wikipedia failed or answered unexpectedly'],
  'upstream-throttled': [
    HTTP_SERVICE_UNAVAILABLE,
    'Wikipedia throttled the request (see Retry-After)',
  ],
  'upstream-timeout': [
    HTTP_GATEWAY_TIMEOUT,
    'Wikipedia did not answer in time',
  ],
  'database-unavailable': [
    HTTP_SERVICE_UNAVAILABLE,
    'The database did not answer the readiness query',
  ],
} as const;

export type ProblemType = keyof typeof PROBLEM_RESPONSES;

interface ProblemResponse {
  description: string;
  content: { 'application/problem+json': { schema: typeof Problem } };
}

export function problemResponses(
  ...types: readonly ProblemType[]
): Record<number, ProblemResponse> {
  return Object.fromEntries(
    types.map((type) => {
      const {
        [type]: [status, description],
      } = PROBLEM_RESPONSES;
      return [
        status,
        {
          description,
          content: { 'application/problem+json': { schema: Problem } },
        },
      ];
    })
  );
}

export const UPSTREAM_PROBLEMS = [
  'upstream',
  'upstream-throttled',
  'upstream-timeout',
] as const satisfies readonly ProblemType[];
