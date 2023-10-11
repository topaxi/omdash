import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store';
import { memoryStyles } from './memory.styles.js';
import { formatBytes } from '../../utils/format/formatBytes.js';

@customElement('om-memory')
export class OmMemory extends connect()(LitElement) {
  static styles = memoryStyles;

  @property()
  accessor hostname = '';

  @state()
  private accessor total = 1;

  @state()
  private accessor free = 1;

  @state()
  private accessor swaptotal = 0;

  @state()
  private accessor swapfree = 0;

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

  private renderAvailableMemory() {
    const { total, free } = this;

    if (total === 1 && free === 1) {
      return '';
    }

    return html`
      <div class="available-memory">
        <span>${formatBytes(total - free)}</span>
        <span>${formatBytes(total)}</span>
      </div>
    `;
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
