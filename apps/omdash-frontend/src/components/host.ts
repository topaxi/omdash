import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ClockController } from '../controllers/clock.js';
import { connect } from '../store/connect.js';
import { RootState } from '../store/index.js';

import './ago.js';
import { OmBox } from './box.js';
import './gauge.js';
import './os-icon.js';
import './process-list.js';

interface CpuInfo {
  model: string;
  speed: number;
  times: { user: number; nice: number; sys: number; idle: number; irq: number };
}

@customElement('om-host')
export class OmHost extends connect()(LitElement) {
  static styles = [
    OmBox.styles,
    css`
      :host {
        flex: 1 1 0;
        max-width: calc(50% - 0.5rem);
        overflow: hidden;
        container: host / inline-size;
      }

      :host(.offline) {
        opacity: 0.8;
        filter: grayscale();
      }

      .host-title {
        display: flex;
        gap: 1ch;
      }

      .battery {
        margin-left: auto;
      }

      .load-average {
        display: flex;
        gap: 1ch;
        width: max-content;
        margin: 0 auto;
      }

      .load-average,
      .available-memory {
        text-align: center;
        font-size: 0.8rem;
      }

      .memory-usage,
      .cpu-usage {
        position: relative;
        display: flex;
        justify-content: center;
      }

      .cpu-speed {
        position: absolute;
        top: 2.75em;
        font-size: 0.8rem;
        color: var(--ctp-macchiato-red);
      }

      om-gauge {
        width: 134px;
      }

      @container host (min-width: 330px) {
        om-gauge {
          width: 160px;
        }

        .cpu-speed {
          font-size: 1rem;
        }

        .load-average,
        .available-memory {
          font-size: 1rem;
        }
      }

      @container host (min-width: 420px) {
        om-gauge {
          width: 220px;
        }

        .cpu-speed {
          top: 4em;
        }
      }

      @keyframes pulse {
        0% {
          opacity: 1;
        }

        50% {
          opacity: 0.2;
        }

        100% {
          opacity: 1;
        }
      }

      .critical {
        animation: pulse 1s infinite;
      }

      .critical,
      .very-high {
        color: var(--ctp-macchiato-red);
      }

      .high {
        color: var(--ctp-macchiato-maroon);
      }

      .medium {
        color: var(--ctp-macchiato-peach);
      }

      .low {
        color: var(--ctp-macchiato-yellow);
      }

      .very-low {
        color: var(--ctp-macchiato-green);
      }
    `,
  ];

  private now = new ClockController(this, 5000);

  @property()
  hostname = '';

  @state()
  private platform = '';

  @state()
  private release = '';

  @state()
  private cpus: readonly CpuInfo[] = [];

  @state()
  private pcpus: readonly CpuInfo[] = [];

  @state()
  private lastUpdate = Date.now();

  @state()
  private loadAverage: [number, number, number] = [0, 0, 0];

  @state()
  private memory = { total: 1, free: 1 };

  @state()
  private addr = '';

  @state()
  private processCount = 0;

  @state()
  private battery: { isCharging: boolean; percent: number } | null = null;

  override stateChanged(state: RootState): void {
    this.addr = state.clients[this.hostname]?.addr ?? '';
    this.platform = state.clients[this.hostname]?.platform ?? '';
    this.release = state.clients[this.hostname]?.release ?? '';
    this.cpus = state.clients[this.hostname]?.cpus ?? [];
    this.pcpus = state.clients[this.hostname]?.pcpus ?? [];
    this.loadAverage = state.clients[this.hostname]?.load ?? [0, 0, 0];
    this.memory = state.clients[this.hostname]?.memory ?? { total: 1, free: 1 };
    this.lastUpdate =
      state.clients[this.hostname]?.lastUpdate || this.lastUpdate;
    this.processCount = state.clients[this.hostname]?.ps?.count ?? 0;
    this.battery = state.clients[this.hostname]?.battery ?? null;

    this.classList.toggle('offline', this.isOffline);
  }

  private averageCPUSpeed() {
    if (this.cpus.length === 0) {
      return 0;
    }

    return (
      this.cpus.reduce((acc, cpu) => acc + cpu.speed, 0) / this.cpus.length
    );
  }

  private get isOffline() {
    return this.now.value - this.lastUpdate > 10_000;
  }

  private formatIp(addr: string) {
    if (addr.startsWith('::ffff:')) {
      return addr.slice(7);
    } else {
      return addr;
    }
  }

  private renderLastUpdate() {
    if (this.isOffline) {
      return html`
        <span class="last-update">
          (<om-ago date="${this.lastUpdate}"></om-ago>)
        </span>
      `;
    }

    return '';
  }

  private renderLoadAverage() {
    // On Windows, Node.js returns [0, 0, 0], so we do not render load at all.
    if (this.loadAverage.reduce((a, b) => a + b, 0) === 0) {
      return '';
    }

    return html`
      <div class="load-average">
        ${this.loadAverage.map(
          (n) =>
            html`<div class="${this.getLoadAverageClass(n)}">
              ${n.toFixed(2)}
            </div>`,
        )}
      </div>
    `;
  }

  private getLoadAverageClass(value: number) {
    const cpus = this.cpus.length;

    if (value > cpus * 1.5) {
      return 'critical';
    }

    if (value > cpus) {
      return 'very-high';
    }

    if (value > cpus / 2) {
      return 'high';
    }

    if (value > cpus / 4) {
      return 'medium';
    }

    if (value > cpus / 8) {
      return 'low';
    }

    if (value > cpus / 16) {
      return 'very-low';
    }

    return 'normal';
  }

  private renderMemoryUsage() {
    const memoryPercentage =
      ((this.memory.total - this.memory.free) / this.memory.total) * 100;
    return html`
      <div class="memory-usage">
        <om-gauge
          style="--color: var(--ctp-macchiato-mauve)"
          label="Mem"
          percent="${Math.round(memoryPercentage)}"
        ></om-gauge>
      </div>
    `;
  }

  private formatBytes(bytes: number) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

    let unitIndex = 0;
    while (bytes > 1024) {
      bytes /= 1024;
      unitIndex++;
    }

    return `${bytes.toFixed(1)}${units[unitIndex]}`;
  }

  private formatMegahertz(megahertz: number) {
    const units = ['MHz', 'GHz'];

    let unitIndex = 0;
    while (megahertz > 1000) {
      megahertz /= 1000;
      unitIndex++;
    }

    return `${megahertz.toFixed(unitIndex == 0 ? 0 : 1)}${units[unitIndex]}`;
  }

  private renderAvailableMemory() {
    const { total, free } = this.memory;

    if (total === 1 && free === 1) {
      return '';
    }

    return html`<div class="available-memory">
      ${this.formatBytes(total - free)}/${this.formatBytes(total)}
    </div>`;
  }

  private renderCPUUsage() {
    const averageCPUUsage = this.averageCPUUsage();

    return html`
      <div class="cpu-usage">
        <div class="cpu-speed">
          ${this.formatMegahertz(this.averageCPUSpeed())}
        </div>
        <om-gauge
          style="--color: var(--ctp-macchiato-red)"
          label="CPU"
          percent="${Math.round(averageCPUUsage)}"
        ></om-gauge>
      </div>
    `;
  }

  private getTotalCPUTimes(cpus: readonly CpuInfo[]) {
    return cpus
      .map((cpu) => cpu.times)
      .reduce(
        (acc, times) => {
          acc.idle += times.idle;
          acc.total +=
            times.user + times.nice + times.sys + times.idle + times.irq;

          return acc;
        },
        { idle: 0, total: 0 },
      );
  }

  private averageCPUUsage() {
    const cpuTimes = this.getTotalCPUTimes(this.cpus);
    const prevCpuTimes = this.getTotalCPUTimes(this.pcpus);

    if (prevCpuTimes.idle === 0) {
      return 0;
    }

    const idleDifference = cpuTimes.idle - prevCpuTimes.idle;
    const totalDifference = cpuTimes.total - prevCpuTimes.total;

    if (totalDifference === 0) {
      return 0;
    }

    return 100 - (100 * idleDifference) / totalDifference;
  }

  private getBatteryLevelIcon(battery: {
    isCharging: boolean;
    percent: number;
  }) {
    if (battery.isCharging) {
      return '';
    }

    const icons = ['', '', '', '', ''];

    return icons[Math.floor((battery.percent / 100) * icons.length)];
  }

  private renderBattery() {
    if (this.battery == null) {
      return '';
    }

    return html`
      <div class="battery">
        ${this.getBatteryLevelIcon(this.battery)} ${this.battery.percent}%
      </div>
    `;
  }

  render() {
    return html`
      <div class="host-info">
        <div class="host-title">
          <om-os-icon
            platform="${this.platform}"
            release="${this.release}"
          ></om-os-icon>
          <div class="hostname">
            ${this.hostname} ${this.renderLastUpdate()}
          </div>
          ${this.renderBattery()}
        </div>
        <small>${this.formatIp(this.addr)}</small>
      </div>
      <div style="display: flex">
        <div style="flex: 1 1 0;margin-right: 0.5rem">
          ${this.renderCPUUsage()} ${this.renderLoadAverage()}
        </div>
        <div style="flex: 1 1 0">
          ${this.renderMemoryUsage()} ${this.renderAvailableMemory()}
        </div>
      </div>
      <div class="processes">Processes: ${this.processCount}</div>
      <om-process-list name=${this.hostname}></om-process-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-host': OmHost;
  }
}
