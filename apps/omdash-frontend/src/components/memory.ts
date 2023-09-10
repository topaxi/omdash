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

    .memory-usage {
      position: relative;
      display: flex;
      justify-content: center;
    }

    .available-memory {
      text-align: center;
      font-size: 0.8rem;
    }

    @container host (min-width: 330px) {
      om-gauge {
        width: 160px;
      }

      .available-memory {
        font-size: 1rem;
      }
    }

    @container host (min-width: 420px) {
      om-gauge {
        width: 220px;
      }
    }
  `;

  @property()
  hostname = '';

  @state()
  memory: { total: number; free: number } = { total: 1, free: 1 };

  override stateChanged(state: RootState) {
    this.memory = state.clients[this.hostname]?.memory ?? { total: 1, free: 1 };
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

    return html`
      <div class="memory-usage">
        <om-gauge
          style="--color: var(--ctp-macchiato-mauve)"
          label="Mem"
          percent="${Math.round(memoryPercentage)}"
        ></om-gauge>
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
