import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect';
import { RootState } from '../../store';

interface CpuInfo {
  model: string;
  speed: number;
  times: { user: number; nice: number; sys: number; idle: number; irq: number };
}

@customElement('om-cpu')
export class OmCpu extends connect()(LitElement) {
  static styles = css`
    .load-average {
      display: flex;
      gap: 1ch;
      width: max-content;
      margin: 0 auto;
      text-align: center;
      font-size: 0.8rem;
    }

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

    .cpu-temperature {
      position: absolute;
      left: 0;
      font-size: 0.8rem;
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

      .cpu-temperature {
        top: 0.5rem;
      }

      .load-average {
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
  `;

  @property()
  hostname = '';

  @state()
  private cpuTemperature = 0;

  @state()
  private cpus: readonly CpuInfo[] = [];

  @state()
  private pcpus: readonly CpuInfo[] = [];

  @state()
  private loadAverage: [number, number, number] = [0, 0, 0];

  override stateChanged(state: RootState): void {
    const client = state.clients[this.hostname];

    if (!client) {
      return;
    }

    this.cpus = client.cpus ?? [];
    this.pcpus = client.pcpus ?? [];
    this.loadAverage = client.load ?? [0, 0, 0];
    this.cpuTemperature = Math.round(client.temperature?.cpu?.max ?? 0);
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
          percent=${Math.round(averageCPUUsage)}
        >
          ${this.cpuTemperature > 0
            ? html`
                <div class="cpu-temperature"> ${this.cpuTemperature}°C</div>
              `
            : ''}
        </om-gauge>
      </div>
    `;
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

  private formatMegahertz(megahertz: number) {
    const units = ['MHz', 'GHz'];

    let unitIndex = 0;
    while (megahertz > 1000) {
      megahertz /= 1000;
      unitIndex++;
    }

    return `${megahertz.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
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
            html`<div class=${this.getLoadAverageClass(n)}>
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

  private averageCPUSpeed() {
    if (this.cpus.length === 0) {
      return 0;
    }

    return (
      this.cpus.reduce((acc, cpu) => acc + cpu.speed, 0) / this.cpus.length
    );
  }

  protected render(): unknown {
    return html` ${this.renderCPUUsage()} ${this.renderLoadAverage()} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-cpu': OmCpu;
  }
}
