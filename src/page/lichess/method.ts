import { z } from 'zod/mini';

// A method of one of Lichess's objects. A schema can only check that it's a
// function, so its result stays unknown; its parameters type our own calls,
// which a function taking anything accepts.

type Method<Params extends unknown[]> = (...args: Params) => unknown;

const isFunction = (value: unknown): boolean => typeof value === 'function';

export const method = <Params extends unknown[]>(): z.ZodMiniCustom<
  Method<Params>,
  Method<Params>
> => z.custom<Method<Params>>(isFunction);
