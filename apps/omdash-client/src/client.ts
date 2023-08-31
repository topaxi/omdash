import os from 'os';
import WebSocket from 'ws';

const UPDATE_INTERVAL = 5000;

function encode(val: any) {
  return JSON.stringify(val);
}

function connect(url: string) {
  console.log('Connecting to', url);

  const timeout: NodeJS.Timeout | null = null;
  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('Connected');

    setInterval(() => {
      ws.send(encode(getMetrics()));
    }, UPDATE_INTERVAL);

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

function getMetrics() {
  return {
    type: 'metric',
    payload: {
      cpus: os.cpus(),
      load: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
    },
  };
}
