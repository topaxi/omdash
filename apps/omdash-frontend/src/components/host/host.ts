import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { ClockController } from '../../controllers/clock.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store/index.js';

import '../ago/ago.js';
import '../gauge/gauge.js';
import '../cpu/cpu.js';
import '../gpu/gpu.js';
import '../memory/memory.js';
import '../mount/mount.js';
import '../os-icon/os-icon.js';
import '../process-list/process-list.js';
import { hostStyles } from './host.styles.js';

function formatTime(seconds: number) {
  if (seconds < 60) {
    return seconds + 's';
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainderSeconds = seconds % 60;
    const minuteText = minutes + 'm';
    const secondText = remainderSeconds + 's';
    return `${minuteText}${secondText}`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const remainderMinutes = Math.floor((seconds % 3600) / 60);
    const hourText = hours + 'h';
    const minuteText = remainderMinutes + 'm';
    return `${hourText}${minuteText}`;
  } else {
    const days = Math.floor(seconds / 86400);
    const remainderHours = Math.floor((seconds % 86400) / 3600);
    const dayText = days + 'd';
    const hourText = remainderHours + 'h';
    return `${dayText}${hourText}`;
  }
}

@customElement('om-host')
export class OmHost extends connect()(LitElement) {
  static styles = hostStyles;

  private now = new ClockController(this, 5000);

  @property()
  accessor hostname = '';

  @state()
  accessor uptime = 0;

  @state()
  private accessor platform = '';

  @state()
  private accessor release = '';

  @state()
  private accessor lastUpdate = Date.now();

  @state()
  private accessor addr = '';

  @state()
  private accessor processCount = 0;

  @state()
  private accessor battery: { isCharging: boolean; percent: number } | null =
    null;

  @state()
  private accessor gpuIndices: number[] = [];

  @state()
  private accessor fsSize: { size: number; used: number; mount: string }[] = [];

  private gpuProvidesMetrics(
    gpu: RootState['clients'][string]['gpus'][number],
  ) {
    return Boolean(gpu.utilizationGpu || (gpu.memoryUsed && gpu.memoryTotal));
  }

  override stateChanged(state: RootState): void {
    const client = state.clients[this.hostname];

    if (!client) {
      return;
    }

    this.addr = client.addr ?? '';
    this.uptime = Math.round(client.uptime) || 0;
    this.platform = client.platform ?? '';
    this.release = client.release ?? '';
    this.lastUpdate = client.lastUpdate || this.lastUpdate;
    this.processCount = client.ps?.count ?? 0;
    this.battery = client.battery ?? null;
    this.gpuIndices =
      client.gpus
        ?.map((_, i) => i)
        .filter((gpuIndex) => this.gpuProvidesMetrics(client.gpus[gpuIndex])) ??
      [];
    this.fsSize = (client.fsSize ?? []).sort((a, b) =>
      a.mount.localeCompare(b.mount),
    );

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

  private renderUptime() {
    if (this.uptime === 0) {
      return '';
    }

    return html`<span class="uptime">(up ${formatTime(this.uptime)})</span>`;
  }

  private renderLastUpdate() {
    if (this.isOffline) {
      return html`
        <span class="last-update">
          (<om-ago date=${this.lastUpdate}></om-ago>)
        </span>
      `;
    }

    return '';
  }

  private getBatteryLevelIcon(battery: {
    isCharging: boolean;
    percent: number;
  }) {
    if (battery.isCharging) {
      return '';
    }

    const icons = ['', '', '', '', '', '', '', ''];

    return icons[Math.floor((battery.percent / 100) * (icons.length - 1))];
  }

  private renderBattery() {
    if (this.battery == null) {
      return '';
    }

    return html`
      <div class="battery ${this.battery.percent < 10 ? 'critical' : ''}">
        ${this.getBatteryLevelIcon(this.battery)} ${this.battery.percent}%
      </div>
    `;
  }

  render() {
    return html`
      <div class="host-info">
        <div class="host-title">
          <om-os-icon
            hostname=${this.hostname}
            platform=${this.platform}
            release=${this.release}
          ></om-os-icon>
          <div class="hostname">
            ${this.hostname.split('.')[0]} ${this.renderUptime()}
            ${this.renderLastUpdate()}
          </div>
          <small class="host-addr">${this.formatIp(this.addr)}</small>
          ${this.renderBattery()}
        </div>
      </div>
      <div class="gauges">
        <om-cpu part="cpu" hostname=${this.hostname}></om-cpu>
        <om-memory part="memory" hostname=${this.hostname}></om-memory>
        ${repeat(
          this.gpuIndices,
          (i) => i,
          (i) =>
            html`<om-gpu
              part="gpu"
              hostname=${this.hostname}
              gpuIndex=${i}
            ></om-gpu>`,
        )}
      </div>
      <div style="display: flex; gap: 1rem">
        <div class="process-list">
          <div class="processes">Processes: ${this.processCount}</div>
          <om-process-list name=${this.hostname}></om-process-list>
        </div>
        <div class="mount-list">
          <div class="mounts">Drives</div>
          ${repeat(
            this.fsSize,
            (fs) => fs.mount,
            (fs) => html`
              <om-mount
                mount=${fs.mount}
                size=${fs.size}
                used=${fs.used}
              ></om-mount>
            `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-host': OmHost;
  }
}
