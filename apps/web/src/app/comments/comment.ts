export interface CommentDraft {
  name: string;
  text: string;
}

export interface Comment extends CommentDraft {
  id: number;
}
