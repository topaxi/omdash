import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store';
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
  memory: RootState['clients'][string]['memory'] = {
    limit: 100,
    history: [],
  };

  get latestMemoryInfo() {
    return this.memory.history.at(-1);
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

  override stateChanged(state: RootState) {
    const memory = state.clients[this.hostname]?.memory;

    if (!memory) {
      return;
    }

    this.memory = memory;
  }

  get memoryHistory() {
    return this.memory.history.map(
      (memory) => ((memory.total - memory.available) / this.total) * 100,
    );
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

  render() {
    const { total, available, swaptotal, swapfree } = this;

    const memoryPercentage = ((total - available) / total) * 100;
    const swapPercentage =
      swaptotal === 0 ? 0 : ((swaptotal - swapfree) / swaptotal) * 100;

    return html`
      <om-bspark .values=${this.memoryHistory} rows="4"></om-bspark>
      <div class="memory-usage">
        <om-gauge
          class="memory ${memoryPercentage > 90 ? 'critical' : ''}"
          style="--color: var(--ctp-macchiato-mauve)"
          label="Mem"
          percent=${Math.round(memoryPercentage)}
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
