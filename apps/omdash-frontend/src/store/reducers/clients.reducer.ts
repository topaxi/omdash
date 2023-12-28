import type { OmClientAction } from '../action.js';
import {
  HistoryState,
  createHistoryReducer,
  selectHistory,
} from './history.reducer.js';

export interface CpuInfo {
  model: string;
  speed: number;
  speedMin: number;
  speedMax: number;
  times: { user: number; nice: number; sys: number; idle: number; irq: number };
}

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

export interface MemoryInfo {
  total: number;
  free: number;
  used: number;
  active: number;
  available: number;
  buffcache: number;
  swaptotal: number;
  swapused: number;
  swapfree: number;
}

export interface GpuInfo {
  bus?: string;
  model?: string;
  vendor?: string;
  vram?: number;
  vramDynamic?: boolean;
  clockCore?: number;
  clockMemory?: number;
  driverVersion?: string;
  memoryFree?: number;
  memoryTotal?: number;
  memoryUsed?: number;
  name?: string;
  pciBus?: string;
  powerDraw?: number;
  powerLimit?: number;
  subDeviceId?: string;
  temperatureGpu?: number;
  utilizationGpu?: number;
  utilizationMemory?: number;
}

export interface ClientState {
  addr: string;
  hostname: string;
  platform: string;
  release: string;
  uptime: number;
  lastUpdate: number;
  load: [number, number, number];
  cpus: HistoryState<CpuInfo[]>;
  memory: HistoryState<MemoryInfo>;
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
  gpus: HistoryState<GpuInfo[]>;
  fsSize: Array<{
    size: number;
    used: number;
    mount: string;
  }>;
}

export interface ClientsState {
  [key: string]: ClientState;
}

export const initialClientsState: ClientsState = {};

const clientCPUsHistoryReducer = createHistoryReducer(
  function clientCPUsReducer(
    state: CpuInfo[] = [],
    action: MetricAction,
  ): CpuInfo[] {
    if (action.type !== 'client/metric' || !action.payload.cpus) {
      return state;
    }

    return action.payload.cpus;
  },
);

const clientGPUsHistoryReducer = createHistoryReducer(
  function clientGPUsReducer(
    state: GpuInfo[] = [],
    action: MetricAction,
  ): GpuInfo[] {
    if (action.type !== 'client/metric' || !action.payload.gpus) {
      return state;
    }

    return action.payload.gpus;
  },
);

const clientMemoryHistoryReducer = createHistoryReducer(
  function clientMemoryReducer(
    state: MemoryInfo = {
      total: 0,
      free: 0,
      used: 0,
      active: 0,
      available: 0,
      buffcache: 0,
      swaptotal: 0,
      swapused: 0,
      swapfree: 0,
    },
    action: MetricAction,
  ): MemoryInfo {
    if (action.type !== 'client/metric' || !action.payload.memory) {
      return state;
    }

    return action.payload.memory;
  },
);

function clientReducer(
  state: ClientState,
  action:
    | RegisterAction
    | UnregisterAction
    | MetricAction
    | PsAction
    | BatteryAction
    | TemperatureAction,
): ClientState {
  switch (action.type) {
    case 'client/register':
      return {
        ...state,
        ...action.payload,
      };

    case 'client/metric': {
      return {
        ...state,
        ...action.payload,
        cpus: clientCPUsHistoryReducer(state.cpus, action),
        memory: clientMemoryHistoryReducer(state.memory, action),
        gpus: clientGPUsHistoryReducer(state.gpus, action),
      };
    }

    case 'client/ps': {
      return {
        ...state,
        ps: action.payload,
      };
    }

    case 'client/battery': {
      return {
        ...state,
        battery: action.payload,
      };
    }

    case 'client/temperature': {
      return {
        ...state,
        temperature: action.payload,
      };
    }

    default:
      return state;
  }
}

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
  if (action.client == null) {
    return state;
  }

  switch (action.type) {
    default:
    case 'client/register':
      return {
        ...state,
        [action.client]: {
          ...clientReducer(state[action.client] ?? {}, action),
          // TODO: Side effect in reducers should be avoided.
          //       Use an rtk listener instead.
          lastUpdate: Date.now(),
        },
      };

    case 'client/unregister': {
      const { [action.client]: _, ...clients } = state;

      return clients;
    }
  }
}
