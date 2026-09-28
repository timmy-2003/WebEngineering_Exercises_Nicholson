// Search highlighter feature

import { requireElement } from './dom.ts';

export function initSearchHighlighter(): void {
  const form = requireElement<HTMLFormElement>('.search');

  form.addEventListener(
    'submit',
    function (this: HTMLFormElement, e: SubmitEvent) {
      e.preventDefault();

      const article = requireElement('article');

      article.querySelectorAll('.highlight').forEach((el) => {
        const { parentNode: parent } = el;
        if (parent === null) return;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      });

      // `this.q` worked at runtime (named form controls are exposed as properties on <form>), but
      // TypeScript's HTMLFormElement type doesn't model that legacy behavior, so it isn't
      // type-safe. `elements.namedItem` plus an `instanceof` check is the typed equivalent.
      const queryInput = this.elements.namedItem('q');
      if (!(queryInput instanceof HTMLInputElement)) {
        throw new Error('Expected search form to contain an input named "q".');
      }

      const searchKey = queryInput.value.trim();
      if (searchKey === '') return;

      // The `v` flag reserves several characters inside a character class for set-notation syntax
      // (`[`, `{`, `}`, `(`, `)`, `|`), so they need escaping here even though the older `u` flag
      // didn't require it.
      const escaped = searchKey.replace(/[.*+?^$\{\}\(\)\|\[\]\\]/gv, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'giv');

      const walk = (node: ChildNode): void => {
        if (node instanceof Text) {
          const match = node.nodeValue?.match(regex);
          if (match === null || match === undefined) {
            return;
          }
          const span = document.createElement('span');
          span.innerHTML = (node.nodeValue ?? '').replace(
            regex,
            '<mark class="highlight">$1</mark>'
          );
          node.replaceWith(...span.childNodes);
        } else if (node instanceof Element) {
          if (
            node.tagName !== 'SCRIPT' &&
            node.tagName !== 'STYLE' &&
            node.tagName !== 'FORM'
          ) {
            node.childNodes.forEach(walk);
          }
        }
      };

      walk(article);
    }
  );
}
