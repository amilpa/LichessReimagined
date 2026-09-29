import { FPS, HEIGHT, WIDTH } from './constants.ts';
import { hexToRgb } from './geometry.ts';
import { still } from './track.ts';
import type {
  Animation,
  FillItem,
  GradientFillItem,
  GroupItem,
  ImageAsset,
  ImageLayer,
  Layer,
  LayerTransform,
  NumberProperty,
  ShapeItem,
  ShapeLayer,
  StrokeItem,
  VectorProperty,
} from './types.ts';

// Lottie's building blocks. Each call returns a fresh object (see track.ts).

const opaque = (hex: string): VectorProperty => still([...hexToRgb(hex), 1]);

export const fill = (hex: string): FillItem => ({ ty: 'fl', c: opaque(hex), o: still(100), r: 1 });

interface StrokeOptions {
  readonly color: string;
  readonly width: number;
  readonly opacity: NumberProperty;
}

export const stroke = ({ color, width, opacity }: StrokeOptions): StrokeItem => ({
  ty: 'st',
  c: opaque(color),
  o: opacity,
  w: still(width),
  lc: 2,
  lj: 2,
});

/** Pairs two lists item by item, up to the shorter one's length. */
function zip<First, Second>(
  first: readonly First[],
  second: readonly Second[],
): (readonly [First, Second])[] {
  return first.flatMap((item, i): (readonly [First, Second])[] => {
    const other = second[i];
    return other === undefined ? [] : [[item, other]];
  });
}

interface GradientOptions {
  /** Top to bottom, with each one's offset (0 to 1). */
  readonly colors: readonly string[];
  readonly offsets: readonly number[];
  /** The rows it runs between, from top to bottom. */
  readonly from: number;
  readonly to: number;
}

export function verticalGradient({ colors, offsets, from, to }: GradientOptions): GradientFillItem {
  const stops = zip(colors, offsets);
  const values: number[] = [];
  for (const [color, offset] of stops) values.push(offset, ...hexToRgb(color));
  return {
    ty: 'gf',
    o: still(100),
    r: 1,
    t: 1,
    s: still([WIDTH / 2, from]),
    e: still([WIDTH / 2, to]),
    g: { p: stops.length, k: still(values) },
  };
}

export const group = (items: readonly ShapeItem[]): GroupItem => ({
  ty: 'gr',
  it: [
    ...items,
    {
      ty: 'tr',
      p: still([0, 0]),
      a: still([0, 0]),
      s: still([100, 100]),
      r: still(0),
      o: still(100),
    },
  ],
});

export const stillTransform = (): LayerTransform => ({
  o: still(100),
  r: still(0),
  p: still([0, 0, 0]),
  a: still([0, 0, 0]),
  s: still([100, 100, 100]),
});

interface ShapeLayerOptions {
  readonly name: string;
  readonly index: number;
  readonly shapes: readonly ShapeItem[];
  readonly end: number;
  readonly transform?: LayerTransform;
}

export const shapeLayer = ({
  name,
  index,
  shapes,
  end,
  transform = stillTransform(),
}: ShapeLayerOptions): ShapeLayer => ({
  ddd: 0,
  ind: index,
  ty: 4,
  nm: name,
  sr: 1,
  ip: 0,
  op: end,
  st: 0,
  ks: transform,
  shapes,
  ao: 0,
  bm: 0,
});

interface ImageLayerOptions {
  readonly name: string;
  readonly index: number;
  readonly asset: string;
  readonly end: number;
  readonly transform: LayerTransform;
}

export const imageLayer = ({
  name,
  index,
  asset,
  end,
  transform,
}: ImageLayerOptions): ImageLayer => ({
  ddd: 0,
  ind: index,
  ty: 2,
  nm: name,
  refId: asset,
  sr: 1,
  ip: 0,
  op: end,
  st: 0,
  ao: 0,
  bm: 0,
  ks: transform,
});

interface AnimationOptions {
  readonly name: string;
  readonly layers: readonly Layer[];
  readonly end: number;
  readonly assets?: readonly ImageAsset[];
}

export const animation = ({ name, layers, end, assets = [] }: AnimationOptions): Animation => ({
  v: '5.12.0',
  fr: FPS,
  ip: 0,
  op: end,
  w: WIDTH,
  h: HEIGHT,
  nm: name,
  ddd: 0,
  assets,
  layers,
});
