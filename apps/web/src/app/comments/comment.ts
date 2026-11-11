export interface CommentDraft {
  author: string;
  text: string;
}

export interface Comment extends CommentDraft {
  id: string;
  bearId: string;
  createdAt: string;
}
