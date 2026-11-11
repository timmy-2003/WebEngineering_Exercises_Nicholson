import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export interface TextSegment {
  text: string;
  match: boolean;
}

const PARTS_PER_MATCH = 2;

export function splitForHighlight(text: string, query: string): TextSegment[] {
  const needle = query.trim();
  if (needle === '') {
    return [{ text, match: false }];
  }

  // The `v` flag reserves several characters inside a character class for set-notation syntax
  // (`[`, `{`, `}`, `(`, `)`, `|`), so they need escaping here.
  const escaped = needle.replace(/[.*+?^$\{\}\(\)\|\[\]\\]/gv, '\\$&');
  const matcher = new RegExp(`(${escaped})`, 'iv');

  return text
    .split(matcher)
    .map((part, index) => ({
      text: part,
      match: index % PARTS_PER_MATCH === 1,
    }))
    .filter((segment) => segment.text !== '');
}

@Component({
  selector: 'app-highlight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (segment of segments(); track $index) {
      @if (segment.match) {
        <mark class="highlight">{{ segment.text }}</mark>
      } @else {
        <span>{{ segment.text }}</span>
      }
    }
  `,
})
export class Highlight {
  readonly text = input.required<string>();
  readonly query = input('');

  protected readonly segments = computed(() =>
    splitForHighlight(this.text(), this.query())
  );
}
