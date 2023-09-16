import os from 'node:os';
import { ProcessDescriptor } from 'ps-list';

const processNameFilters = ['ps', '0'];

const psList = async function(...args: any[]) {
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

  const query =
    'SELECT Name, PercentProcessorTime, WorkingSet FROM Win32_PerfFormattedData_PerfProc_Process';

  const processes: any[] = await new Promise((resolve, reject) =>
    wmiClient.query(query, (err: any, result: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    }),
  );

  const totalmem = os.totalmem();

  return processes
    .filter((p) => p.Name != 'Idle' && p.Name != '_Total')
    .map(
      (process: any) =>
        ({
          name: process.Name,
          cpu: process.PercentProcessorTime,
          memory: (process.WorkingSet / totalmem) * 100,
        }) as any,
    );
}

const getProcessList = process.platform == 'win32' ? wmiProcessList : psList;

export async function getProcesses() {
  const processes = await getProcessList();
  const merged = mergeProcesses(filterProcesses(processes));
  const processCount = 5;

  return {
    type: 'ps',
    payload: {
      count: processes.length,
      highestCpu: merged.sort(byCpu).slice(0, processCount),
      highestMemory: merged.sort(byMemory).slice(0, processCount),
    },
  };
}

function byCpu(a: { cpu: number }, b: { cpu: number }) {
  return b.cpu - a.cpu;
}

function byMemory(a: { memory: number }, b: { memory: number }) {
  return b.memory - a.memory;
}

function filterProcesses(processes: ProcessDescriptor[]) {
  return processes.filter((p) => !processNameFilters.includes(p.name));
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

const normalizationNameMap: Record<string, string> = {
  'Isolated Web Co': 'firefox',
  'Isolated Servic': 'firefox',
  'firefox': 'firefox',
  'WebExtensions': 'firefox',
  'Web Content': 'firefox',
  'RDD Process': 'firefox',
  'Socket Process': 'firefox',
  'telegram-deskt': 'telegram',
  'wezterm': 'wezterm',
};

function normalizeName(name: string) {
  let key: string | undefined;
  if (
    (key = Object.keys(normalizationNameMap).find((n) => name.startsWith(n)))
  ) {
    return normalizationNameMap[key];
  }

  if (name.includes('#') && /#\d+$/.test(name)) {
    return name.replace(/#\d+$/, '');
  }

  return name;
}
