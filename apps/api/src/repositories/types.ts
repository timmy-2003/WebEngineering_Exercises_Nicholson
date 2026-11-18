import type { Bear, BearDetail } from '../schemas/bear.js';
import type { Comment } from '../schemas/comment.js';

export interface BearRepository {
  list: () => Promise<Bear[]>;
  get: (id: string) => Promise<BearDetail | null>;
  upsertMany: (bears: readonly BearDetail[]) => Promise<void>;
}

export interface NewCommentRecord {
  bearId: string;
  author: string;
  text: string;
}

export interface CommentRepository {
  listByBear: (bearId: string) => Promise<Comment[]>;
  findById: (id: string) => Promise<Comment | null>;
  /** Rejects with NotFoundError if the bear does not exist. */
  create: (input: NewCommentRecord) => Promise<Comment>;
  delete: (id: string) => Promise<boolean>;
}

export interface Repos {
  bears: BearRepository;
  comments: CommentRepository;
}
