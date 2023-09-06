import os from 'node:os';

import { Tracert } from './tracert.js';
import { Traceroute } from './traceroute.js';

export default os.platform() === 'win32' ? Tracert : Traceroute;
