import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect';
import { RootState } from '../../store';

@customElement('om-memory')
export class OmMemory extends connect()(LitElement) {
  static styles = css`
    om-gauge {
      width: 134px;
    }

    .swap {
      /* Assumption that a system will rarely if ever reduce swap back to 0%,
       * we only care about fading in.
       */
      animation: fade-in 0.5s ease-in-out;
      width: 110px;
      position: absolute;
      bottom: 1px;
      z-index: -1;

      --dial-stroke-width: 0;
      --stroke-width: 2;
      --text-transform: translateY(-1rem);
    }

    .memory-usage {
      position: relative;
      display: flex;
      justify-content: center;
    }

    .available-memory {
      display: flex;
      justify-content: center;
      font-size: 0.8rem;
    }

    .available-memory > span:last-child::before {
      content: '/';
    }

    @keyframes fade-in {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
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
