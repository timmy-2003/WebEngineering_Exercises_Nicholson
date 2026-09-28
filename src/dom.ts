// Deliberately explicit-override generic, mirroring the DOM's own `querySelector<T>`: T can't be
// inferred from a string selector, so it exists purely for call sites to state the type they
// expect back.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- see comment above
export function requireElement<T extends Element = Element>(
  selector: string,
  parent: ParentNode = document
): T {
  const element = parent.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`Expected element matching "${selector}" to exist.`);
  }
  return element;
}
