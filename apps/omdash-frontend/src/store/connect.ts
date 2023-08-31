import { Action, Store, Unsubscribe } from 'redux';
import { store as defaultStore } from './index.js';

type Constructor<T> = new (...args: any[]) => T;

interface CustomElement extends HTMLElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  readonly isConnected: boolean;
}

export const connect =
  <S, A extends Action>(store: Store<S, A> = defaultStore as any) =>
  <T extends Constructor<CustomElement>>(BaseElement: T) =>
    class extends BaseElement {
      private _storeUnsubscribe: Unsubscribe | null = null;

      connectedCallback() {
        super.connectedCallback?.();

        this._storeUnsubscribe = store.subscribe(() => {
          this.stateChanged(store.getState());
        });

        this.stateChanged(store.getState());
      }

      disconnectedCallback(): void {
        this._storeUnsubscribe?.();

        super.disconnectedCallback?.();
      }

      stateChanged(_state: S): void {}

      get store() {
        return store;
      }

      dispatch(action: A) {
        this.store.dispatch(action);
      }
    };
