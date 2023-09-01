import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { ClockController } from '../controllers/clock.js';
import { connect } from '../store/connect.js';
import { RootState } from '../store/index.js';

import './ago.js';
import './gauge.js';
import './os-icon.js';

interface CpuInfo {
  model: string;
  speed: number;
  times: { user: number; nice: number; sys: number; idle: number; irq: number };
}

@customElement('om-host')
export class OmHost extends connect()(LitElement) {
  static styles = css`
    :host {
      flex: 0 1 calc(50% - 0.5rem / 2);
      border-radius: 6px;
      border: 1px solid var(--ctp-macchiato-lavender);
      background-color: rgb(var(--ctp-macchiato-base-raw), 66.6%);
      backdrop-filter: blur(8px) grayscale(1);

      padding: 0.2rem 0.33rem;
    }

    .load-average,
    .available-memory {
      text-align: center;
    }

    .process-list {
      display: flex;
      gap: 1rem;
    }

    .process-list > div {
      flex: 1 0 50%;
    }
  `;

  private now = new ClockController(this, 5000);

  @property()
  name = '';

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
  private highestCPUProcesses: any[] = [];

  @state()
  private highestMemoryProcesses: any[] = [];

  override stateChanged(state: RootState): void {
    this.addr = state.clients[this.name]?.addr ?? '';
    this.platform = state.clients[this.name]?.platform ?? '';
    this.release = state.clients[this.name]?.release ?? '';
    this.cpus = state.clients[this.name]?.cpus ?? [];
    this.pcpus = state.clients[this.name]?.pcpus ?? [];
    this.loadAverage = state.clients[this.name]?.load ?? [0, 0, 0];
    this.memory = state.clients[this.name]?.memory ?? { total: 1, free: 1 };
    this.lastUpdate = state.clients[this.name]?.lastUpdate || this.lastUpdate;
    this.processCount = state.clients[this.name]?.ps?.count ?? 0;
    this.highestCPUProcesses = state.clients[this.name]?.ps?.highestCpu ?? [];
    this.highestMemoryProcesses =
      state.clients[this.name]?.ps?.highestMemory ?? [];
  }

  private renderLastUpdate() {
    if (this.now.value - this.lastUpdate > 10_000) {
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
          percent="${memoryPercentage.toFixed(2)}"
        >
          Mem ${Math.round(memoryPercentage)}%
        </om-gauge>
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
          percent="${averageCPUUsage.toFixed(2)}"
        >
          CPU ${Math.round(averageCPUUsage)}%
        </om-gauge>
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

  private renderProcessList() {
    return html`
      <div class="process-list">
        <div class="highest-cpu">
          <strong>CPU</strong>
          ${repeat(
            this.highestCPUProcesses,
            (p) => p.pid,
            (p) => html`<div>${p.cpu.toFixed(1)}% ${p.name}</div>`,
          )}
        </div>
        <div class="highest-memory">
          <strong>Memory</strong>
          ${repeat(
            this.highestMemoryProcesses,
            (p) => p.pid,
            (p) => html`<div>${p.memory.toFixed(1)}% ${p.name}</div>`,
          )}
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="hostname">
        <div>
          <om-os-icon
            platform="${this.platform}"
            release="${this.release}"
          ></om-os-icon>
          ${this.name} ${this.renderLastUpdate()}
        </div>
        <small>${this.addr}</small>
      </div>
      <div class="latency">Latency: 0ms</div>
      <div class="uptime">Uptime: 0:00</div>
      <div style="display: flex">
        <div style="margin-right: 0.5rem">
          ${this.renderCPUUsage()} ${this.renderLoadAverage()}
        </div>
        <div>${this.renderMemoryUsage()} ${this.renderAvailableMemory()}</div>
      </div>
      <div class="disk-usage">Disk: 0%</div>
      <div class="network-usage">Network: 0%</div>
      <div class="processes">Processes: ${this.processCount}</div>
      ${this.renderProcessList()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-host': OmHost;
  }
}
