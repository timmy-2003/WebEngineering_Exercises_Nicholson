export interface CommentDraft {
  name: string;
  text: string;
}

export interface Comment extends CommentDraft {
  /** Assigned once on creation and never reused, so it is a stable `track` key. */
  id: number;
}
