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
