import 'reflect-metadata';

export const EFFECT_METADATA_KEY = Symbol('effect');

export function effect(...deps: string[]) {
  return Reflect.metadata(EFFECT_METADATA_KEY, deps);
}
