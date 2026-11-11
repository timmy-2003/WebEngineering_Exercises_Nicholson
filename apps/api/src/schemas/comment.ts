import { z } from 'zod';
import { BearId } from './bear.js';

const MAX_AUTHOR_LENGTH = 80;
const MAX_TEXT_LENGTH = 2000;

export const NewComment = z.object({
  author: z
    .string()
    .trim()
    .min(1, 'author must not be empty')
    .max(MAX_AUTHOR_LENGTH),
  text: z.string().trim().min(1, 'text must not be empty').max(MAX_TEXT_LENGTH),
});
export type NewComment = z.infer<typeof NewComment>;

export const Comment = NewComment.extend({
  id: z.uuid(),
  bearId: BearId,
  createdAt: z.iso.datetime(),
});
export type Comment = z.infer<typeof Comment>;

export const CommentList = z.object({
  items: z.array(Comment),
  nextCursor: z.null(),
});

export const CommentIdParams = z.object({
  commentId: z.uuid(),
});
