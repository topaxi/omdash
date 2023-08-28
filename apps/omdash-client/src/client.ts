import os from 'os';
import WebSocket from 'ws';

function encode(val: any) {
  return JSON.stringify(val);
}

function connect(url: string) {
  console.log('Connecting to', url);

  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('Connected');

    ws.send(encode({
      type: 'register',
      payload: {
        name: os.hostname(),
      }
    }));
  });

  ws.once('close', () => {
    console.log('Connection closed');

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

const ws = connect('ws://localhost:3200');

setInterval(() => {
  ws.send(encode(getRandomEvent()));
}, 1000);

function getRandomEvent() {
  const events = ['cpu', 'load', 'memory', 'processes'];

  switch (events[Math.floor(Math.random() * events.length)]) {
    case 'cpu':
      return {
        type: 'metric',
        payload: {
          cpus: os.cpus().map((cpu) => ({
            model: cpu.model,
            speed: cpu.speed,
            times: { user: cpu.times.user, nice: cpu.times.nice, sys: cpu.times.sys, idle: cpu.times.idle },
          })),
        }
      };
    case 'load':
      return {
        type: 'metric',
        payload: {
          load: os.loadavg(),
        },
      };
    case 'memory':
      return {
        type: 'metric',
        payload: {
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
          },
        },
      };
    case 'processes':
      return {
        type: 'metric',
        payload: {
          processes: [],
        },
      };
  }

}
