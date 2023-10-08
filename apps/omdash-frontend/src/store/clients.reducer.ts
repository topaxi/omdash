import { OmClientAction } from './action';

export type RegisterAction = OmClientAction<
  'register',
  { addr: string; hostname: string }
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
export type BatteryAction = OmClientAction<
  'battery',
  {
    isCharging: boolean;
    percent: number;
  }
>;
export type TemperatureAction = OmClientAction<
  'temperature',
  {
    cpu: {
      main: number;
      cores: number[];
      max: number;
      socket: number[];
      chipset: number;
    };
  }
>;

export interface ClientState {
  addr: string;
  hostname: string;
  platform: string;
  release: string;
  uptime: number;
  lastUpdate: number;
  load: [number, number, number];
  cpus: any[];
  pcpus: any[];
  memory: {
    total: number;
    free: number;
    used: number;
    active: number;
    available: number;
    buffcache: number;
    swaptotal: number;
    swapused: number;
    swapfree: number;
  };
  ps: {
    count: number;
    highestCpu: any[];
    highestMemory: any[];
  };
  battery: {
    isCharging: boolean;
    percent: number;
  };
  temperature: {
    cpu: {
      main: number;
      cores: number[];
      max: number;
      socket: number[];
      chipset: number;
    };
  };
}

export interface ClientsState {
  [key: string]: ClientState;
}

export const initialClientsState: ClientsState = {};

export function clientsReducer(
  state: ClientsState = initialClientsState,
  action:
    | RegisterAction
    | UnregisterAction
    | MetricAction
    | PsAction
    | BatteryAction
    | TemperatureAction,
): ClientsState {
  switch (action.type) {
    case 'register':
      return {
        ...state,
        [action.payload.hostname]: {
          ...state[action.payload.hostname],
          ...action.payload,
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
          memory: {
            ...state[action.client]?.memory,
            ...action.payload.memory,
          },
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

    case 'battery': {
      return {
        ...state,
        [action.client]: {
          ...state[action.client],
          battery: action.payload,
        },
      };
    }

    case 'temperature': {
      return {
        ...state,
        [action.client]: {
          ...state[action.client],
          temperature: action.payload,
        },
      };
    }

    default:
      return state;
  }
}
