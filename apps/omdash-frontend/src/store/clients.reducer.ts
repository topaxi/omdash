import { OmClientAction } from './action';

export type RegisterAction = OmClientAction<
  'register',
  { addr: string; name: string }
>;
export type UnregisterAction = OmClientAction<'unregister', {}>;
export type MetricAction = OmClientAction<'metric', Record<string, any>>;
export type PsAction = OmClientAction<
  'ps',
  {
    count: number;
    highestCpu: any[];
    highestMemory: any[];
  }
>;

export interface ClientsState {
  [key: string]: any;
}

export const initialClientsState: ClientsState = {};

export function clientsReducer(
  state: ClientsState = initialClientsState,
  action: RegisterAction | UnregisterAction | MetricAction | PsAction,
): ClientsState {
  switch (action.type) {
    case 'register':
      return {
        ...state,
        [action.payload.name]: {
          ...state[action.payload.name],
          addr: action.payload.addr,
          lastUpdate: Date.now(),
        },
      };

    case 'unregister': {
      const { [action.client]: _, ...clients } = state;

      return clients;
    }

    case 'metric': {
      return {
        ...state,
        [action.client]: {
          ...state[action.client],
          ...action.payload,
          pcpus: action.payload.cpus
            ? state[action.client]?.cpus ?? state[action.client]?.pcpus
            : state[action.client]?.pcpus,
          lastUpdate: Date.now(),
        },
      };
    }

    case 'ps': {
      return {
        ...state,
        [action.client]: {
          ...state[action.client],
          ps: action.payload,
          lastUpdate: Date.now(),
        },
      };
    }

    default:
      return state;
  }
}
