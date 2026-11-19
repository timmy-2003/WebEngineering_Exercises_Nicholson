import { z } from 'zod';
import { InvalidCursorError } from '../errors.js';

const CommentKey = z.object({ createdAt: z.iso.datetime(), id: z.uuid() });
export type CommentKey = z.infer<typeof CommentKey>;

export function encodeCursor({ createdAt, id }: CommentKey): string {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString('base64url');
}

export function decodeCursor(cursor: string): CommentKey {
  try {
    return CommentKey.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    );
  } catch (err) {
    throw new InvalidCursorError('cursor could not be decoded', {
      cause: err,
    });
  }
}

// Fetches one row more than asked for, so the presence of a next page is
// known without a COUNT query.
export function toPage<T extends CommentKey>(
  rows: readonly T[],
  limit: number
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const [last] = rows.slice(limit - 1, limit);
  return {
    items,
    nextCursor:
      rows.length > limit && last !== undefined ? encodeCursor(last) : null,
  };
}
