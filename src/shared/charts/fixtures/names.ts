// Test support for the charts' attribute and CSS variable names, which got
// the `cdc` prefix in the port.

const RENAMED: readonly (readonly [port: string, original: string])[] = [
  ['--cdc-series-color:', '--c:'],
  ['--cdc-marker-color:', '--c:'],
  ['--cdc-bar-index:', '--k:'],
  ['data-cdc-series=', 'data-i='],
  ['data-cdc-bar=', 'data-i='],
  ['data-cdc-range=', 'data-range='],
];

/** Puts the original's names back, to compare our markup with its recordings. */
export const withLegacyNames = (markup: string): string =>
  RENAMED.reduce((text, [port, original]) => text.replaceAll(port, original), markup);

const CUSTOM_PROPERTY = /(--[\w-]+)\s*:/g;

/** The data attributes and CSS variables under `root` that lack the `cdc` prefix. */
export function unprefixedNames(root: Element): string[] {
  const names = new Set<string>();
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const name of element.getAttributeNames())
      if (name.startsWith('data-') && !name.startsWith('data-cdc-')) names.add(name);
    const style = element.getAttribute('style') ?? '';
    for (const [, property = ''] of style.matchAll(CUSTOM_PROPERTY))
      if (!property.startsWith('--cdc-')) names.add(property);
  }
  return [...names];
}
