import {
  PropertyValues,
  ReactiveController,
  ReactiveControllerHost,
} from 'lit';

export type EffectCleanup = () => void;
export type EffectFunction = () => EffectCleanup | void;

export interface Effect {
  index: number;
  effect: EffectFunction;
  deps?: string[];
}

export class EffectsController implements ReactiveController {
  host: ReactiveControllerHost;

  private effects: Effect[] = [];
  private cleanups: Array<EffectCleanup | null> = [];
  private firstRun = true;

  constructor(host: ReactiveControllerHost) {
    (this.host = host).addController(this);
  }

  hostDisconnected(): void {
    this.runCleanups();
  }

  /**
   * Called during the client-side host update, just before the host calls
   *
   * Has to be manually called in the host's `updated()` lifecycle method.
   */
  runEffects(changedProperties: PropertyValues): void {
    this.runCleanups();

    if (!this.firstRun) {
      for (const { index, effect, deps } of this.effects) {
        if (deps!.some((dep) => changedProperties.has(dep))) {
          this.cleanups[index] = effect() ?? null;
        }
      }
    } else {
      for (const { index, effect } of this.effects) {
        this.cleanups[index] = effect() ?? null;
      }
    }

    this.firstRun = false;
  }

  private runCleanups(): void {
    for (const cleanup of this.cleanups) {
      cleanup?.();
    }

    this.cleanups.length = 0;
  }

  /**
   * Manually add an effect to be run on the next host update.
   *
   * Internally used via @effect decorator.
   */
  addEffect(effect: Effect): void {
    this.effects.push({ deps: [], ...effect });
  }
}
