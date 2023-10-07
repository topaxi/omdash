import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store';
import { memoryStyles } from './memory.styles.js';

@customElement('om-memory')
export class OmMemory extends connect()(LitElement) {
  static styles = memoryStyles;

  @property()
  hostname = '';

  @state()
  private total = 1;

  @state()
  private free = 1;

  @state()
  private swaptotal = 0;

  @state()
  private swapfree = 0;

  override stateChanged(state: RootState) {
    const memory = state.clients[this.hostname]?.memory;

    if (!memory) {
      return;
    }

    this.total = memory.total ?? 1;
    this.free = memory.free ?? 1;
    this.swaptotal = memory.swaptotal ?? 0;
    this.swapfree = memory.swapfree ?? 0;
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
    const { total, free } = this;

    if (total === 1 && free === 1) {
      return '';
    }

    return html`<div class="available-memory">
      <span>${this.formatBytes(total - free)}</span>
      <span>${this.formatBytes(total)}</span>
    </div>`;
  }

  render() {
    const { total, free, swaptotal, swapfree } = this;

    const memoryPercentage = ((total - free) / total) * 100;
    const swapPercentage =
      swaptotal === 0 ? 0 : ((swaptotal - swapfree) / swaptotal) * 100;

    return html`
      <div class="memory-usage">
        <om-gauge
          class="memory ${memoryPercentage > 90 ? 'critical' : ''}"
          style="--color: var(--ctp-macchiato-mauve)"
          label="Mem"
          percent=${Math.round(memoryPercentage)}
        ></om-gauge>
        ${swapPercentage > 1
          ? html`<om-gauge
              class="swap"
              style="--color: var(--ctp-macchiato-yellow)"
              label="Swap"
              percent=${Math.round(swapPercentage)}
            ></om-gauge>`
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
