import { LitElement, html, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store/index.js';
import { gpuStyles } from './gpu.styles.js';
import { formatBytes } from '../../utils/format/formatBytes.js';

@customElement('om-gpu')
export class OmMemory extends connect()(LitElement) {
  static styles = gpuStyles;

  @property()
  accessor hostname = '';

  @property({ type: Number })
  accessor gpuIndex = 0;

  @state()
  private accessor gpuTemperature = 0;

  @state()
  private accessor utilization = 0;

  @state()
  private accessor memoryUsed = 0;

  @state()
  private accessor memoryTotal = 0;

  override stateChanged(state: RootState) {
    const gpu = state.clients[this.hostname]?.gpus?.[this.gpuIndex];

    if (!gpu) {
      return;
    }

    this.gpuTemperature = gpu.temperatureGpu ?? 0;
    this.utilization = gpu.utilizationGpu ?? 0;
    this.memoryUsed = (gpu.memoryUsed ?? 0) * 1024 * 1024;
    this.memoryTotal = (gpu.memoryTotal ?? 0) * 1024 * 1024;
  }

  private renderAvailableMemory() {
    const { memoryTotal, memoryUsed } = this;

    if (memoryTotal === 0 && memoryUsed === 0) {
      return '';
    }

    return html`
      <div class="available-memory">
        <span>${formatBytes(memoryUsed)}</span>
        <span>${formatBytes(memoryTotal)}</span>
      </div>
    `;
  }

  render() {
    const { memoryTotal, memoryUsed, utilization } = this;

    const memoryPercentage = (memoryUsed / memoryTotal) * 100;

    return html`
      <div class="gpu-usage">
        <om-gauge
          class="utilization ${utilization > 90 ? 'critical' : ''}"
          style="--color: var(--ctp-macchiato-teal)"
          label="GPU"
          percent=${Math.round(utilization)}
        >
          <svg viewBox="0 0 100 55" class="gpu-text-overlay">
            ${this.gpuTemperature > 0
              ? svg`
                  <text
                    class="gpu-temperature"
                    x="5"
                    y="7"
                    text-anchor="left"
                    alignment-baseline="middle"
                    dominant-baseline="central"
                  >
                     ${this.gpuTemperature}°C
                  </text>
                `
              : ''}
          </svg>
        </om-gauge>
        <om-gauge
          class="memory ${memoryPercentage > 90 ? 'critical' : ''}"
          style="--color: var(--ctp-macchiato-green)"
          label="VRAM"
          percent=${Math.round(memoryPercentage)}
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
