import { html, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { type RootState } from '../../store';
import { type CpuInfo } from '../../store/reducers/clients.reducer.js';
import { selectCPUHistory } from '../../store/reducers/clients.selectors.js';
import { formatMegahertz } from '../../utils/format/formatMegahertz.js';
import { cpuStyles } from './cpu.styles.js';

import '../bspark/bspark.js';
import { OmdashComponent } from '../../base/OmdashComponent.js';

function getCPUSpeed(cpu: Readonly<CpuInfo>): number {
  return cpu.speed;
}

function getTotalCPUTimes(cpus: readonly CpuInfo[]) {
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

function getAverageCPUUsage(prev: CpuInfo[], current: CpuInfo[]) {
  const prevCpuTimes = getTotalCPUTimes(prev);
  const cpuTimes = getTotalCPUTimes(current);

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

// TODO: This should be moved to a selector.
export function getAverageCPUUsageByHistory(
  history: CpuInfo[][],
  projectCpuInfo = (cpuInfo: CpuInfo[]) => cpuInfo,
) {
  return getAverageCPUUsage(
    projectCpuInfo(history.at(-2) ?? []),
    projectCpuInfo(history.at(-1) ?? []),
  );
}

@customElement('om-cpu')
export class OmCpu extends connect()(OmdashComponent) {
  static styles = cpuStyles;

  @property()
  accessor hostname = '';

  @state()
  private accessor cpuModel = '';

  @state()
  private accessor cpuTemperature = 0;

  @state()
  private accessor cpuHistory: RootState['clients'][string]['cpus']['history'] =
    [];

  @state()
  private accessor loadAverage: [number, number, number] = [0, 0, 0];

  @state()
  private accessor cpuMinSpeed = Number.MAX_SAFE_INTEGER;

  @state()
  private accessor cpuMaxSpeed = Number.MIN_SAFE_INTEGER;

  override stateChanged(state: RootState): void {
    const client = state.clients[this.hostname];

    if (!client) {
      return;
    }

    this.cpuHistory = selectCPUHistory(client);
    this.loadAverage = client.load ?? [0, 0, 0];
    this.cpuModel = this.cpuHistory.at(-1)?.[0]?.model ?? '';
    this.cpuTemperature = Math.round(client.temperature?.cpu?.max);

    const cpuSpeeds = this.currentCPUInfo.map(getCPUSpeed);

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

  private get cpuName() {
    return this.cpuModel
      .replace(/\d+-Core Processor/g, '')
      .replace(/with Radeon Graphics/g, '')
      .trim();
  }

  private get currentCPUInfo() {
    return this.cpuHistory.at(-1) ?? [];
  }

  private get averageCPUUsage() {
    return getAverageCPUUsageByHistory(this.cpuHistory);
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

  private get cpuCount() {
    return this.currentCPUInfo.length;
  }

  private getLoadAverageClass(value: number) {
    const cpus = this.cpuCount;

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
    const { cpuCount } = this;

    if (cpuCount === 0) {
      return 0;
    }

    return (
      this.currentCPUInfo.reduce((acc, cpu) => acc + cpu.speed, 0) / cpuCount
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

  private get sparkValues() {
    return this.cpuHistory
      .slice(-60)
      .map((cpus, i, history) => {
        if (i === 0) {
          return 0;
        }

        return Math.round(getAverageCPUUsage(history[i - 1], cpus));
      })
      .slice(1);
  }

  protected render(): unknown {
    return html`
      <om-bspark .values=${this.sparkValues} rows="4"></om-bspark>
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
                  ${formatMegahertz(this.averageCPUSpeed)}
                </text>
              `
            : ''}
          ${this.cpuTemperature > 0 && this.cpuTemperature < 128
            ? svg`
                <text
                  class="cpu-temperature"
                  x="5"
                  y="15"
                  text-anchor="left"
                  alignment-baseline="middle"
                  dominant-baseline="central"
                >
                   ${this.cpuTemperature}°C
                </text>
              `
            : ''}
          ${this.cpuName !== ''
            ? svg`
                <text
                  class="cpu-name"
                  x="50%"
                  y="0"
                  text-anchor="middle"
                  dominant-baseline="hanging"
                >
                  ${this.cpuName}
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
