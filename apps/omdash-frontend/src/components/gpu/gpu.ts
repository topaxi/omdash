import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store/index.js';
import { gpuStyles } from './gpu.styles.js';

@customElement('om-gpu')
export class OmMemory extends connect()(LitElement) {
  static styles = gpuStyles;

  @property()
  hostname = '';

  @property({ type: Number })
  gpuIndex = 0;

  @state()
  private gpuTemperature = 0;

  @state()
  private utilization = 0;

  @state()
  private memoryUsed = 0;

  @state()
  private memoryTotal = 0;

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
    const { memoryTotal, memoryUsed } = this;

    if (memoryTotal === 0 && memoryUsed === 0) {
      return '';
    }

    return html`<div class="available-memory">
      <span>${this.formatBytes(memoryUsed)}</span>
      <span>${this.formatBytes(memoryTotal)}</span>
    </div>`;
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
          ${this.gpuTemperature > 0
            ? html`<div class="gpu-temperature">
                 ${this.gpuTemperature}°C
              </div>`
            : ''}
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
