import { z } from 'zod';

export const BearId = z.string().regex(/^[a-z]+(?:-[a-z]+)*$/v);

export const Bear = z.object({
  id: BearId,
  name: z.string().min(1),
  binomial: z.string().min(1),
  imageUrl: z.url().nullable(),
  range: z.string(),
});
export type Bear = z.infer<typeof Bear>;

export const BearList = z.object({
  items: z.array(Bear),
  nextCursor: z.null(),
});

export const BearDetail = Bear.extend({
  intro: z.string(),
});
export type BearDetail = z.infer<typeof BearDetail>;

export const BearListQuery = z.object({
  q: z.string().trim().optional(),
});

export const BearIdParams = z.object({
  id: BearId,
});
