import { z } from 'zod';
import { BearId } from './bear.js';

const MAX_AUTHOR_LENGTH = 80;
const MAX_TEXT_LENGTH = 2000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const NewComment = z.object({
  author: z
    .string()
    .trim()
    .min(1, 'author must not be empty')
    .max(
      MAX_AUTHOR_LENGTH,
      `author must be at most ${MAX_AUTHOR_LENGTH} characters`
    ),
  text: z
    .string()
    .trim()
    .min(1, 'text must not be empty')
    .max(MAX_TEXT_LENGTH, `text must be at most ${MAX_TEXT_LENGTH} characters`),
});
export type NewComment = z.infer<typeof NewComment>;

export const Comment = NewComment.extend({
  id: z.uuid(),
  bearId: BearId,
  createdAt: z.iso.datetime(),
  reportCount: z.number().int().nonnegative(),
  hiddenAt: z.iso.datetime().nullable(),
});
export type Comment = z.infer<typeof Comment>;

export const CommentList = z.object({
  items: z.array(Comment),
  nextCursor: z.string().nullable(),
});

export const CommentListQuery = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
});

export const CommentIdParams = z.object({
  commentId: z.uuid(),
});
