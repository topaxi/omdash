import os from 'node:os';
import WebSocket from 'ws';
import si from 'systeminformation';
import { pick } from './utils/pick';
import { setIntervalImmediate } from './utils/timers';
import { getProcesses } from './processes';
import { getAMDGPUInfo } from './rocm';

process.title = 'omdash-client';

const WINDOWS = os.platform() === 'win32';

if (WINDOWS) {
  si.powerShellStart();

  const stop = () => si.powerShellRelease();

  process.on('beforeExit', stop);
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  process.on('SIGQUIT', stop);
}

const UPDATE_INTERVAL = 2000;
const PS_UPDATE_INTERVAL = 4000;

let pingTimer: NodeJS.Timeout | null = null;

function heartbeat(this: WebSocket) {
  clearTimeout(pingTimer!);

  pingTimer = setTimeout(() => {
    this.terminate();
  }, 10_000 + 1000);
}

function encode(val: any) {
  return JSON.stringify(val);
}

let connectTimeout = 1000;
function connect(url: string) {
  console.log('Connecting to', url);

  const timers: NodeJS.Timeout[] = [];
  const ws = new WebSocket(url);

  function unregister() {
    ws.send(
      encode({
        type: 'unregister',
      }),
    );
  }

  ws.on('open', heartbeat);
  ws.on('open', async () => {
    console.log('Connected');

    connectTimeout = 1000;

    ws.send(
      encode({
        type: 'register',
        payload: {
          arch: os.arch(),
          platform: os.platform(),
          release: os.release(),
          hostname: os.hostname(),
        },
      }),
    );

    timers.push(
      setIntervalImmediate(() => {
        ws.send(encode(getMetrics()));
      }, UPDATE_INTERVAL),
    );

    timers.push(
      setIntervalImmediate(async () => {
        ws.send(encode(await getGPUs()));
      }, UPDATE_INTERVAL),
    );

    timers.push(
      setIntervalImmediate(() => {
        ws.send(encode(getUptime()));
      }, 1000 * 60),
    );

    timers.push(
      setIntervalImmediate(async () => {
        ws.send(encode(await getProcesses()));
      }, PS_UPDATE_INTERVAL),
    );

    timers.push(
      setIntervalImmediate(async () => {
        ws.send(encode(await getTemperatures()));
      }, 10_000),
    );

    timers.push(
      setIntervalImmediate(async () => {
        ws.send(encode(await getMemory()));
      }, UPDATE_INTERVAL),
    );

    timers.push(
      setIntervalImmediate(async () => {
        ws.send(encode(await getDisks()));
      }, 5_000),
    );

    // If the connection closes before the first battery update, this probably introduces
    // a memory leak. The timer should be cleaned up on the next close event though.
    if ((await si.battery()).hasBattery) {
      timers.push(
        setIntervalImmediate(async () => {
          ws.send(
            encode({
              type: 'battery',
              payload: pick(await si.battery(), [
                'isCharging',
                'percent',
                'timeRemaining',
              ]),
            }),
          );
        }, 10_000),
      );
    }
  });

  ws.on('ping', heartbeat);

  ws.once('close', () => {
    console.log('Connection closed');

    clearTimeout(pingTimer!);

    while (timers.length !== 0) {
      clearInterval(timers.pop()!);
    }

    setTimeout(() => {
      if (connectTimeout < 32_000) {
        connectTimeout *= 2;
      }

      connect(url);
    }, connectTimeout);
  });

  ws.on('error', (error) => {
    console.error(error);

    ws.close();
  });

  function signalhandler() {
    unregister();

    process.exit();
  }

  process.on('beforeExit', unregister);
  process.on('SIGINT', signalhandler);
  process.on('SIGTERM', signalhandler);
  process.on('SIGQUIT', signalhandler);

  return ws;
}

const omdashServerHost = process.env.OMDASH_SERVER_HOST || 'localhost:3200';

connect(`ws://${omdashServerHost}`);

async function getTemperatures() {
  const cpuTemperature = await si.cpuTemperature();

  return {
    type: 'temperature',
    payload: {
      cpu: cpuTemperature,
    },
  };
}

async function getMemory() {
  const memory = await si.mem();

  return {
    type: 'metric',
    payload: { memory },
  };
}

function getMetrics() {
  return {
    type: 'metric',
    payload: {
      cpus: os.cpus(),
      load: os.loadavg(),
    },
  };
}

function getUptime() {
  return {
    type: 'metric',
    payload: {
      uptime: os.uptime(),
    },
  };
}

function hasAMDGPU(controllers: si.Systeminformation.GraphicsControllerData[]) {
  return controllers.some((controller) => controller.vendor.includes('AMD'));
}

async function getGPUs() {
  const graphics = await si.graphics();

  if (hasAMDGPU(graphics.controllers)) {
    const amdGPUInfo = await getAMDGPUInfo();

    for (const controller of graphics.controllers) {
      const amdGPU = amdGPUInfo.find(
        (amdgpu) => amdgpu['PCI Bus'].slice(5) === controller.busAddress,
      );

      if (amdGPU != null) {
        controller.utilizationGpu = Number(amdGPU['GPU use (%)']);
        controller.memoryTotal =
          Number(amdGPU['VRAM Total Memory (B)']) / 1024 / 1024;
        controller.memoryUsed =
          Number(amdGPU['VRAM Total Used Memory (B)']) / 1024 / 1024;
        controller.temperatureGpu = Number(
          amdGPU['Temperature (Sensor edge) (C)'],
        );
      }
    }
  }

  return {
    type: 'metric',
    payload: {
      gpus: graphics.controllers,
    },
  };
}

async function getDisks() {
  return {
    type: 'metric',
    payload: {
      fsSize: (await si.fsSize()).filter(
        ({ fs }) => fs.startsWith('/dev/') || /^[A-Z]:/.test(fs),
      ),
    },
  };
}
