import { LitElement, html, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { type RootState } from '../../store';
import { type CpuInfo } from '../../store/reducers/clients.reducer.js';
import { cpuStyles } from './cpu.styles.js';

@customElement('om-cpu')
export class OmCpu extends connect()(LitElement) {
  static styles = cpuStyles;

  @property()
  accessor hostname = '';

  @state()
  private accessor cpuTemperature = 0;

  @state()
  private accessor cpus: readonly CpuInfo[] = [];

  @state()
  private accessor pcpus: readonly CpuInfo[] = [];

  @state()
  private accessor loadAverage: [number, number, number] = [0, 0, 0];

  @state()
  private accessor cpuMinSpeed = Number.MAX_SAFE_INTEGER;

  @state()
  private accessor cpuMaxSpeed = Number.MIN_SAFE_INTEGER;

  private getCPUSpeed(cpu: Readonly<CpuInfo>): number {
    return cpu.speed;
  }

  override stateChanged(state: RootState): void {
    const client = state.clients[this.hostname];

    if (!client) {
      return;
    }

    this.cpus = client.cpus.history.at(-1) ?? [];
    this.pcpus = client.cpus.history.at(-2) ?? [];
    this.loadAverage = client.load ?? [0, 0, 0];
    this.cpuTemperature = Math.round(client.temperature?.cpu?.max);

    const cpuSpeeds = this.cpus.map(this.getCPUSpeed, this);

    this.cpuMinSpeed = Math.min(
      this.cpuMinSpeed,
      this.averageCPUSpeed,
      ...cpuSpeeds,
    );
    this.cpuMaxSpeed = Math.max(
      this.cpuMaxSpeed,
      this.averageCPUSpeed,
      ...cpuSpeeds,
    );
  }

  private get averageCPUUsage() {
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

  private get averageCPUSpeed() {
    if (this.cpus.length === 0) {
      return 0;
    }

    return (
      this.cpus.reduce((acc, cpu) => acc + cpu.speed, 0) / this.cpus.length
    );
  }

  private get shouldRenderCPUSpeed() {
    return this.cpuMinSpeed !== this.cpuMaxSpeed;
  }

  private get cpuSpeedPercent() {
    return (
      ((this.averageCPUSpeed - this.cpuMinSpeed) /
        (this.cpuMaxSpeed - this.cpuMinSpeed)) *
      100
    );
  }

  protected render(): unknown {
    return html`
      <om-gauge
        class="cpu-usage"
        style="--color: var(--ctp-macchiato-red)"
        label="CPU"
        percent=${Math.round(this.averageCPUUsage)}
      >
        <svg viewBox="0 0 100 55" class="cpu-text-overlay">
          ${this.averageCPUSpeed
            ? svg`
                <text
                  class="cpu-speed"
                  x="50"
                  y="37"
                  text-anchor="middle"
                  alignment-baseline="middle"
                  dominant-baseline="central"
                >
                  ${this.formatMegahertz(this.averageCPUSpeed)}
                </text>
              `
            : ''}
          ${this.cpuTemperature > 0 && this.cpuTemperature < 128
            ? svg`
                <text
                  class="cpu-temperature"
                  x="5"
                  y="7"
                  text-anchor="left"
                  alignment-baseline="middle"
                  dominant-baseline="central"
                >
                   ${this.cpuTemperature}°C
                </text>
              `
            : ''}
        </svg>
        ${this.renderLoadAverage()}
      </om-gauge>
      ${this.shouldRenderCPUSpeed
        ? html`
            <om-gauge
              class="cpu-speed-gauge"
              style="--color: var(--ctp-macchiato-peach)"
              percent=${this.cpuSpeedPercent}
            ></om-gauge>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-cpu': OmCpu;
  }
}
