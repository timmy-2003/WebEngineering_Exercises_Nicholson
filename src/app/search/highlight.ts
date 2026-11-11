// Search highlighting, expressed as derived rendering instead of DOM surgery: rather than walking
// the article and splicing <mark> elements into nodes Angular owns, every highlightable piece of
// text is rendered through <app-highlight>, which splits it into matched / unmatched segments.

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

/** Splits `text` into segments, flagging every case-insensitive occurrence of `query`. */
export function splitForHighlight(text: string, query: string): TextSegment[] {
  const needle = query.trim();
  if (needle === '') {
    return [{ text, match: false }];
  }

  // The `v` flag reserves several characters inside a character class for set-notation syntax
  // (`[`, `{`, `}`, `(`, `)`, `|`), so they need escaping here.
  const escaped = needle.replace(/[.*+?^$\{\}\(\)\|\[\]\\]/gv, '\\$&');
  const matcher = new RegExp(`(${escaped})`, 'iv');

  // With one capturing group, `split` keeps the separators, so the result alternates
  // [text, match, text, match, ...]: every second part is a match.
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
  // Segments are positional slices of one string with no identity of their own, so `$index`
  // is the correct track expression here (unlike for bears or comments). Every segment is an
  // element, so template formatting whitespace never leaks into the rendered text.
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
