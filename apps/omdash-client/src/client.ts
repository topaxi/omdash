import os from 'os';
import { ProcessDescriptor } from 'ps-list';
import WebSocket from 'ws';

const UPDATE_INTERVAL = 5000;
const PS_UPDATE_INTERVAL = 5000;

function encode(val: any) {
  return JSON.stringify(val);
}

function setIntervalImmediate(callback: () => void, interval: number) {
  callback();

  return setInterval(callback, interval);
}

const psList = async function (...args: any[]) {
  const m = (await Function('return import("ps-list")')()) as Promise<
    typeof import('ps-list')
  >;

  // @ts-ignore
  return m.default(...args);
} as typeof import('ps-list').default;


let wmiClient: any = null;

async function wmiProcessList(): Promise<ProcessDescriptor[]> {
  // @ts-ignore
  const { default: WmiClient } = await import('wmi-client');

  if (!wmiClient) {
    wmiClient = new WmiClient();
  }

  const query = 'SELECT Name, PercentProcessorTime, WorkingSet FROM Win32_PerfFormattedData_PerfProc_Process';

  const processes: any[] = await new Promise((resolve, reject) => wmiClient.query(query, (err: any, result: any) => {
    if (err) {
      reject(err);
    } else {
      resolve(result);
    }
  }));

  const totalmem = os.totalmem();

  return processes.filter(p => p.Name != 'Idle' && p.Name != '_Total').map((process: any) => ({
    name: process.Name,
    cpu: process.PercentProcessorTime,
    memory: process.WorkingSet / totalmem * 100,
  } as any));
}

function connect(url: string) {
  console.log('Connecting to', url);

  let timeout: NodeJS.Timeout | null = null;
  let psTimeout: NodeJS.Timeout | null = null;
  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('Connected');

    timeout = setIntervalImmediate(() => {
      ws.send(encode(getMetrics()));
    }, UPDATE_INTERVAL);

    psTimeout = setIntervalImmediate(async () => {
      ws.send(encode(await getProcesses()));
    }, PS_UPDATE_INTERVAL);

    ws.send(
      encode({
        type: 'register',
        payload: {
          name: os.hostname(),
        },
      }),
    );
  });

  ws.once('close', () => {
    console.log('Connection closed');

    clearTimeout(timeout!);
    clearTimeout(psTimeout!);

    setTimeout(() => {
      connect(url);
    }, 1000);
  });

  ws.on('error', (error) => {
    console.error(error);

    ws.close();
  });

  return ws;
}

const omdashServerHost = process.env.OMDASH_SERVER_HOST || 'localhost:3200';

connect(`ws://${omdashServerHost}`);

function normalizeName(name: string) {
  if (name.startsWith('Isolated Web Co') || name.startsWith('firefox')) {
    return 'firefox';
  }

  if (name.startsWith('wezterm')) {
    return 'wezterm';
  }

  if (name.includes('#') && /#\d+$/.test(name)) {
    return name.replace(/#\d+$/, '');
  }

  return name;
}

function mergeProcesses(processes: ProcessDescriptor[]) {
  const merged: Record<string, { name: string; cpu: number; memory: number }> =
    {};

  for (const process of processes) {
    const name = normalizeName(process.name);
    const { cpu = 0, memory = 0 } = process;

    if (!merged[name]) {
      merged[name] = {
        name,
        cpu,
        memory,
      };
    } else {
      merged[name].cpu += cpu;
      merged[name].memory += memory;
    }
  }

  return Object.values(merged);
}

async function getProcesses() {
    const processes = process.platform == 'win32' ? await wmiProcessList() : await psList();
    const merged = mergeProcesses(processes);

    return {
      type: 'ps',
      payload: {
        count: processes.length,
        highestCpu: merged
          .filter((p) => p.name != 'ps')
          .sort((a, b) => b.cpu! - a.cpu!)
          .slice(0, 3),
        highestMemory: merged.sort((a, b) => b.memory! - a.memory!).slice(0, 3),
      },
    };
}

function getMetrics() {
  return {
    type: 'metric',
    payload: {
      // TODO: Move static values into register event.
      arch: os.arch(),
      platform: os.platform(),
      release: os.release(),
      cpus: os.cpus(),
      load: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
    },
  };
}
