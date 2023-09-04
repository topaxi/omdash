import { Action as ReduxAction, legacy_createStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';

// TODO: Refactoring into several reducers.
//       One for client registration and one for metrics.
//       Within metrics, one for CPU to hold the history of CPU usage.

export interface Action<T, P> extends ReduxAction<T> {
  client: string;
  payload: P;
}

export type RegisterAction = Action<'register', { addr: string; name: string }>;
export type UnregisterAction = Action<'unregister', {}>;
export type MetricAction = Action<'metric', Record<string, any>>;
export type PsAction = Action<
  'ps',
  {
    count: number;
    highestCpu: any[];
    highestMemory: any[];
  }
>;

export interface RootState {
  clients: Record<string, any>;
}

export const initialState: RootState = {
  clients: {},
};

export function reducer(
  state: RootState = initialState,
  action: RegisterAction | UnregisterAction | MetricAction | PsAction,
) {
  switch (action.type) {
    case 'register':
      return {
        ...state,
        clients: {
          ...state.clients,
          [action.payload.name]: {
            ...state.clients[action.payload.name],
            addr: action.payload.addr,
            lastUpdate: Date.now(),
          },
        },
      };

    case 'unregister': {
      const { [action.client]: _, ...clients } = state.clients;

      return { ...state, clients };
    }

    case 'metric': {
      return {
        ...state,
        clients: {
          ...state.clients,
          [action.client]: {
            ...state.clients[action.client],
            ...action.payload,
            pcpus: action.payload.cpus
              ? state.clients[action.client]?.cpus ??
                state.clients[action.client]?.pcpus
              : state.clients[action.client]?.pcpus,
            lastUpdate: Date.now(),
          },
        },
      };
    }

    case 'ps': {
      return {
        ...state,
        clients: {
          ...state.clients,
          [action.client]: {
            ...state.clients[action.client],
            ps: action.payload,
            lastUpdate: Date.now(),
          },
        },
      };
    }

    default:
      return state;
  }
}

export const store = legacy_createStore(reducer, composeWithDevTools());
