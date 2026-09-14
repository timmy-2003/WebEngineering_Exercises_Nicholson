// Search highlighter feature

export function initSearchHighlighter() {
  // Kept as a regular function, not an arrow function: `this` here is the
  // <form> that dispatched the submit event (addEventListener binds `this`
  // to the element the listener is attached to), and `this.q` reads the
  // named "q" input. An arrow function has no `this` of its own - it would
  // inherit `this` from initSearchHighlighter's scope (undefined in a
  // module), so `this.q` would throw instead of reading the search field.
  document.querySelector('.search').addEventListener('submit', function(e) {
    e.preventDefault();

    const article = document.querySelector('article');

    article.querySelectorAll('.highlight').forEach((el) => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });

    const searchKey = this.q.value.trim();
    if (!searchKey) return;

    const regex = new RegExp('(' + searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');

    const walk = (node) => {
      if (node.nodeType === 3) { // Text node
        const match = node.nodeValue.match(regex);
        if (match) {
          const span = document.createElement('span');
          span.innerHTML = node.nodeValue.replace(regex, '<mark class="highlight">$1</mark>');
          node.replaceWith.apply(node, span.childNodes);
        }
      } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.tagName !== 'FORM') {
        node.childNodes.forEach(walk);
      }
    };

    walk(article);
  });
}
