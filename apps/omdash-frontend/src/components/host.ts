import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ClockController } from '../controllers/clock.js';
import { connect } from '../store/connect.js';
import { RootState } from '../store/index.js';

import './ago.js';
import { OmBox } from './box.js';
import './gauge.js';
import './cpu.js';
import './memory.js';
import './os-icon.js';
import './process-list.js';

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

      .gauges {
        display: flex;
        gap: 0.5rem;
      }

      .gauges > * {
        flex: 1 1 0;
      }

      .host-title {
        display: flex;
        gap: 1ch;
      }

      .battery {
        margin-left: auto;
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
    `,
  ];

  private now = new ClockController(this, 5000);

  @property()
  hostname = '';

  @state()
  uptime = 0;

  @state()
  private platform = '';

  @state()
  private release = '';

  @state()
  private lastUpdate = Date.now();

  @state()
  private addr = '';

  @state()
  private processCount = 0;

  @state()
  private battery: { isCharging: boolean; percent: number } | null = null;

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
          ${this.renderBattery()}
        </div>
        <small>${this.formatIp(this.addr)}</small>
      </div>
      <div class="gauges">
        <om-cpu hostname=${this.hostname}></om-cpu>
        <om-memory hostname=${this.hostname}></om-memory>
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
