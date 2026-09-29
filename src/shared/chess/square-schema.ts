import { z } from 'zod/mini';
import { isSquare } from './squares.ts';
import type { Square } from './types.ts';

/** A square's name ("e4") in outside data. */
export const SquareSchema = z.custom<Square>(value => typeof value === 'string' && isSquare(value));
