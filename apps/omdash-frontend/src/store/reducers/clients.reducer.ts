import type { OmClientAction } from '../action.js';
import { pushCapped } from './history.reducer.js';
import { getAverageCPUUsage } from './cpu-usage.js';

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
export type UnregisterAction = OmClientAction<'unregister', unknown>;
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
  /**
   * Linux-only compressed-memory tiers, sent by the Rust client (tpx-sysmon)
   * and absent from the Node client's `si.mem()` payload. All in bytes.
   */
  zswap?: number;
  zswapped?: number;
  zram?: {
    memUsed: number;
    comprData: number;
    origData: number;
    diskSize: number;
  };
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

/**
 * Compact per-metric state: instead of retaining ~100 full snapshots, we keep
 * only the snapshot(s) the UI actually reads plus a small derived numeric
 * series for the sparkline.
 */
export interface CpuState {
  /** Most recent per-core snapshot (model/speed/count/temp display). */
  latest: CpuInfo[];
  /** Previous per-core snapshot, needed to derive usage deltas on demand. */
  previous: CpuInfo[];
  /** Whole-CPU usage percent series (one point per metric message). */
  usage: number[];
}

export interface GpuState {
  /** Most recent per-GPU snapshot. */
  latest: GpuInfo[];
  /** Per-GPU-index utilization percent series. */
  utilization: number[][];
}

export interface MemoryState {
  latest: MemoryInfo;
  /** Used-memory percent series for the sparkline. */
  usage: number[];
}

export interface ClientState {
  addr: string;
  hostname: string;
  platform: string;
  release: string;
  uptime: number;
  lastUpdate: number;
  load: [number, number, number];
  cpus: CpuState;
  memory: MemoryState;
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
  gpus: GpuState;
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

const initialCpuState: CpuState = { latest: [], previous: [], usage: [] };

function clientCPUsReducer(
  state: CpuState = initialCpuState,
  action: MetricAction,
): CpuState {
  if (action.type !== 'client/metric' || !action.payload.cpus) {
    return state;
  }

  // `?? []` also normalizes any stale, old-shape state rehydrated from
  // IndexedDB (which carried `{ limit, history }` instead of these fields).
  const previous = state.latest ?? [];
  const latest: CpuInfo[] = action.payload.cpus;
  const usage = pushCapped(
    state.usage ?? [],
    Math.round(getAverageCPUUsage(previous, latest)),
  );

  return { latest, previous, usage };
}

const initialGpuState: GpuState = { latest: [], utilization: [] };

function clientGPUsReducer(
  state: GpuState = initialGpuState,
  action: MetricAction,
): GpuState {
  if (action.type !== 'client/metric' || !action.payload.gpus) {
    return state;
  }

  const latest: GpuInfo[] = action.payload.gpus;
  const prevUtilization = state.utilization ?? [];
  const utilization = latest.map((gpu, i) =>
    pushCapped(prevUtilization[i] ?? [], gpu.utilizationGpu ?? 0),
  );

  return { latest, utilization };
}

const initialMemoryInfo: MemoryInfo = {
  total: 0,
  free: 0,
  used: 0,
  active: 0,
  available: 0,
  buffcache: 0,
  swaptotal: 0,
  swapused: 0,
  swapfree: 0,
};

const initialMemoryState: MemoryState = {
  latest: initialMemoryInfo,
  usage: [],
};

function clientMemoryReducer(
  state: MemoryState = initialMemoryState,
  action: MetricAction,
): MemoryState {
  if (action.type !== 'client/metric' || !action.payload.memory) {
    return state;
  }

  const latest: MemoryInfo = action.payload.memory;
  const usagePercent =
    latest.total > 0
      ? ((latest.total - latest.available) / latest.total) * 100
      : 0;
  const usage = pushCapped(state.usage ?? [], usagePercent);

  return { latest, usage };
}

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
      // Each metric message carries only a subset of these fields. Assign the
      // known ones explicitly (rather than spreading the raw payload) so the
      // ClientState keeps a single, stable object shape on the hot path - V8
      // hidden-class stability matters on the Pi's QtWebEngine - the fat
      // cpus/memory/gpus arrays are folded into compact sub-state, and unknown
      // payload keys never leak onto the client (or into IndexedDB).
      const { payload } = action;

      return {
        ...state,
        load: payload.load ?? state.load,
        uptime: payload.uptime ?? state.uptime,
        fsSize: payload.fsSize ?? state.fsSize,
        cpus: clientCPUsReducer(state.cpus, action),
        memory: clientMemoryReducer(state.memory, action),
        gpus: clientGPUsReducer(state.gpus, action),
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
    case 'client/register': {
      // TODO: Side effect in reducers should be avoided.
      //       Use an rtk listener instead.
      const now = Date.now();

      return pruneStaleClients(
        {
          ...state,
          [action.client]: {
            ...clientReducer(state[action.client] ?? {}, action),
            lastUpdate: now,
          },
        },
        now,
      );
    }

    case 'client/unregister': {
      const { [action.client]: _, ...clients } = state;

      return clients;
    }
  }
}

/**
 * How long a client may go without an update before it is dropped from the
 * store entirely. Hosts that simply disappear never send `client/unregister`,
 * so without this sweep their full retained state would leak forever.
 */
const STALE_CLIENT_TTL = 15 * 60 * 1000;

function pruneStaleClients(state: ClientsState, now: number): ClientsState {
  let pruned: ClientsState | null = null;

  for (const [hostname, client] of Object.entries(state)) {
    if (now - (client.lastUpdate ?? 0) > STALE_CLIENT_TTL) {
      pruned ??= { ...state };
      delete pruned[hostname];
    }
  }

  return pruned ?? state;
}
