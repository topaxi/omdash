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

      .load-average,
      .available-memory {
        text-align: center;
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
        ${this.loadAverage.map((n) => n.toFixed(2)).join(' ')}
      </div>
    `;
  }

  private renderMemoryUsage() {
    const memoryPercentage =
      ((this.memory.total - this.memory.free) / this.memory.total) * 100;
    return html`
      <div class="memory-usage">
        <om-gauge
          style="width:160px;--color: var(--ctp-macchiato-mauve)"
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
        <om-gauge
          style="width:160px;--color: var(--ctp-macchiato-red)"
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

  private renderBattery() {
    if (this.battery == null) {
      return '';
    }

    return html`
      <div class="battery">
        ${this.battery.isCharging ? '⚡🔋' : '🔋'} ${this.battery.percent}%
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
        <div style="margin-right: 0.5rem">
          ${this.renderCPUUsage()} ${this.renderLoadAverage()}
        </div>
        <div>${this.renderMemoryUsage()} ${this.renderAvailableMemory()}</div>
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
