/* eslint-disable @typescript-eslint/no-require-imports */
const Service = require('node-windows').Service;
const path = require('path');

var svc = new Service({
  name: 'omdash-client',
  description: 'OmDash Client daemon',
  script: path.join(__dirname, '../apps/omdash-client/build/client.js'),
  env: [
    {
      name: 'NODE_ENV',
      value: 'production',
    },
    {
      name: 'OMDASH_SERVER_HOST',
      value: 'ompi:3200',
    },
  ],
});

if (process.argv[2] === 'uninstall') {
  svc.on('uninstall', function () {
    console.log('Uninstall complete.');
    console.log('The service exists: ', svc.exists);
  });

  svc.uninstall();
  return;
} else {
  svc.on('install', function () {
    svc.start();
  });

  svc.install();
}
