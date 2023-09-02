import os from 'os';
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

async function getProcesses() {
  const processes = await psList();

  return {
    type: 'ps',
    payload: {
      count: processes.length,
      highestCpu: processes
        .filter((p) => p.name != 'ps')
        .sort((a, b) => b.cpu! - a.cpu!)
        .slice(0, 3),
      highestMemory: processes
        .sort((a, b) => b.memory! - a.memory!)
        .slice(0, 3),
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
