import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../store/connect';
import { RootState } from '../store';

@customElement('om-memory')
export class OmMemory extends connect()(LitElement) {
  static styles = css`
    om-gauge {
      width: 134px;
    }

    .swap {
      width: 110px;
      position: absolute;
      bottom: 1px;
      z-index: -1;

      --dial-stroke-width: 0;
      --stroke-width: 2;
    }

    .memory-usage {
      position: relative;
      display: flex;
      justify-content: center;
    }

    .available-memory {
      text-align: center;
      font-size: 0.8rem;
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
      animation: pulse 0.5s infinite ease-in-out;
    }

    @container host (min-width: 330px) {
      om-gauge {
        width: 160px;
      }

      .swap {
        width: 132px;
        bottom: 2px;
        --stroke-width: 2;
      }

      .available-memory {
        font-size: 1rem;
      }
    }

    @container host (min-width: 420px) {
      om-gauge {
        width: 220px;
      }

      .swap {
        width: 180px;
        bottom: 2px;
        --stroke-width: 3;
      }
    }
  `;

  @property()
  hostname = '';

  @state()
  memory: { total: number; free: number; swaptotal: number; swapfree: number } =
    {
      total: 1,
      free: 1,
      swaptotal: 0,
      swapfree: 0,
    };

  override stateChanged(state: RootState) {
    this.memory = state.clients[this.hostname]?.memory ?? {
      total: 1,
      free: 1,
      swaptotal: 0,
      swapfree: 0,
    };
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

  render() {
    const memoryPercentage =
      ((this.memory.total - this.memory.free) / this.memory.total) * 100;
    const swapPercentage =
      this.memory.swaptotal === 0
        ? 0
        : ((this.memory.swaptotal - this.memory.swapfree) /
          this.memory.swaptotal) *
        100;

    return html`
      <div class="memory-usage">
        <om-gauge
          class="memory ${memoryPercentage > 90 ? 'critical' : ''}"
          style="--color: var(--ctp-macchiato-mauve)"
          label="Mem"
          percent="${Math.round(memoryPercentage)}"
        ></om-gauge>
        ${swapPercentage > 1
        ? html`<om-gauge
              class="swap"
              style="--color: var(--ctp-macchiato-yellow)"
              percent="${Math.round(swapPercentage)}"
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
