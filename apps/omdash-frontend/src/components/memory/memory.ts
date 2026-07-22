import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store';
import { type MemoryInfo } from '../../store/reducers/clients.reducer.js';
import { memoryStyles } from './memory.styles.js';
import { formatBytes } from '../../utils/format/formatBytes.js';

import '../bspark/bspark.js';
import { OmdashComponent } from '../../base/OmdashComponent.js';

@customElement('om-memory')
export class OmMemory extends connect()(OmdashComponent) {
  static styles = memoryStyles;

  @property()
  accessor hostname = '';

  @state()
  private accessor memoryLatest: MemoryInfo | undefined;

  @state()
  private accessor memoryUsageSeries: number[] = [];

  get latestMemoryInfo() {
    return this.memoryLatest;
  }

  get total(): number {
    return this.latestMemoryInfo?.total ?? 1;
  }

  get available(): number {
    return this.latestMemoryInfo?.available ?? 1;
  }

  get swaptotal(): number {
    return this.latestMemoryInfo?.swaptotal ?? 0;
  }

  get swapfree(): number {
    return this.latestMemoryInfo?.swapfree ?? 0;
  }

  /** zswap compressed-pool RAM cost, in bytes (0 when unavailable). */
  get zswapRAM(): number {
    return this.latestMemoryInfo?.zswap ?? 0;
  }

  /** zram device RAM cost, in bytes (0 when unavailable). */
  get zramRAM(): number {
    return this.latestMemoryInfo?.zram?.memUsed ?? 0;
  }

  override stateChanged(state: RootState) {
    const memory = state.clients[this.hostname]?.memory;

    if (!memory) {
      return;
    }

    this.memoryLatest = memory.latest;
    this.memoryUsageSeries = memory.usage;
  }

  get memoryHistory() {
    return this.memoryUsageSeries;
  }

  private renderAvailableMemory() {
    const { total, available } = this;

    if (total === 1 && available === 1) {
      return '';
    }

    return html`
      <div class="available-memory">
        <span>${formatBytes(total - available)}</span>
        <span>${formatBytes(total)}</span>
      </div>
    `;
  }

  /**
   * RAM-ring segments as a share of total RAM: plain working-set memory, then
   * the compressed tiers. zswap pool and zram already sit *inside*
   * `used = total - available`, so the plain-memory segment is subtractive -
   * the three segments sum to `used`, never double-counting.
   *
   * NOTE: validate the subtractive accounting on a host with active zram/zswap
   * (e.g. ompi) - it cannot be checked on machines without those tiers.
   */
  private get memorySegments() {
    const { total, available, zswapRAM, zramRAM } = this;
    const used = total - available;
    const memoryOnly = Math.max(0, used - zswapRAM - zramRAM);

    return [
      {
        percent: (memoryOnly / total) * 100,
        color: 'var(--ctp-macchiato-mauve)',
      },
      { percent: (zswapRAM / total) * 100, color: 'var(--ctp-macchiato-pink)' },
      { percent: (zramRAM / total) * 100, color: 'var(--ctp-macchiato-peach)' },
    ].filter((segment) => Math.round(segment.percent) > 0);
  }

  render() {
    const { total, available, swaptotal, swapfree, zswapRAM, zramRAM } = this;

    const memoryPercentage = ((total - available) / total) * 100;
    const swapPercentage =
      swaptotal === 0 ? 0 : ((swaptotal - swapfree) / swaptotal) * 100;

    // Only switch to segmented rendering when a compressed tier is actually
    // present; otherwise keep the plain, smoothly animated single arc.
    const hasCompressedTiers = zswapRAM > 0 || zramRAM > 0;

    return html`
      <om-bspark .values=${this.memoryHistory} rows="4"></om-bspark>
      <div class="memory-usage">
        <om-gauge
          class="memory ${memoryPercentage > 90 ? 'critical' : ''}"
          style="--color: var(--ctp-macchiato-mauve)"
          label="Mem"
          percent=${Math.round(memoryPercentage)}
          .segments=${hasCompressedTiers ? this.memorySegments : undefined}
        ></om-gauge>
        ${swapPercentage > 1
          ? html`
              <om-gauge
                class="swap"
                style="--color: var(--ctp-macchiato-yellow)"
                label="Swap"
                percent=${Math.round(swapPercentage)}
              ></om-gauge>
            `
          : ''}
      </div>
      ${this.renderAvailableMemory()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-memory': OmMemory;
  }
}
