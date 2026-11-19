import type { Bear, BearDetail } from '../schemas/bear.js';
import type { Comment } from '../schemas/comment.js';

export interface BearRepository {
  /** `q` filters by name (case-insensitive substring). */
  list: (q?: string) => Promise<Bear[]>;
  get: (id: string) => Promise<BearDetail | null>;
  upsertMany: (bears: readonly BearDetail[]) => Promise<void>;
}

export interface NewCommentRecord {
  bearId: string;
  author: string;
  text: string;
}

export interface Page {
  limit: number;
  cursor?: string;
}

export interface CommentPage {
  items: Comment[];
  nextCursor: string | null;
}

export interface CommentRepository {
  /** Newest first. Rejects with InvalidCursorError for a foreign cursor. */
  listByBear: (bearId: string, page: Page) => Promise<CommentPage>;
  findById: (id: string) => Promise<Comment | null>;
  /** Rejects with NotFoundError if the bear does not exist. */
  create: (input: NewCommentRecord) => Promise<Comment>;
  delete: (id: string) => Promise<boolean>;
}

export interface Repos {
  bears: BearRepository;
  comments: CommentRepository;
}
