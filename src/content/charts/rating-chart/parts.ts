import { queryOne } from '#shared/dom.ts';

/** The chart's elements, from `chartShell`. */
export interface ChartParts {
  readonly root: HTMLElement;
  readonly legend: HTMLElement;
  readonly plot: HTMLElement;
  readonly svg: SVGSVGElement;
  readonly tip: HTMLElement;
  readonly thumb: HTMLElement;
}

export function findParts(root: HTMLElement): ChartParts | null {
  const legend = queryOne(root, '.cdc-rchart__legend', HTMLElement);
  const plot = queryOne(root, '.cdc-rchart__plot', HTMLElement);
  const svg = queryOne(root, 'svg', SVGSVGElement);
  const tip = queryOne(root, '.cdc-rchart__tip', HTMLElement);
  const thumb = queryOne(root, '.cdc-rchart__thumb', HTMLElement);
  if (!legend || !plot || !svg || !tip || !thumb) return null;
  return { root, legend, plot, svg, tip, thumb };
}
