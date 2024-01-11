import { html, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store/index.js';
import { gpuStyles } from './gpu.styles.js';
import { formatBytes } from '../../utils/format/formatBytes.js';
import { GpuInfo } from '../../store/reducers/clients.reducer.js';

import '../bspark/bspark.js';
import { OmdashComponent } from '../../base/OmdashComponent.js';

@customElement('om-gpu')
export class OmGpu extends connect()(OmdashComponent) {
  static styles = gpuStyles;

  @property()
  accessor hostname = '';

  @property({ type: Number })
  accessor gpuIndex = 0;

  @state()
  private accessor gpuVendor = '';

  @state()
  private accessor gpuModel = '';

  @state()
  private accessor gpuTemperature = 0;

  @state()
  private accessor utilization = 0;

  @state()
  private accessor memoryUsed = 0;

  @state()
  private accessor memoryTotal = 0;

  @state()
  history: GpuInfo[] = [];

  override stateChanged(state: RootState) {
    const history =
      state.clients[this.hostname]?.gpus?.history
        .map((gpus) => gpus[this.gpuIndex])
        .filter((gpu) => gpu != null) ?? [];
    const gpu = history.at(-1);

    if (!gpu) {
      return;
    }

    this.gpuVendor = gpu.vendor ?? '';
    this.gpuModel = gpu.model ?? '';
    this.gpuTemperature = gpu.temperatureGpu ?? 0;
    this.utilization = gpu.utilizationGpu ?? 0;
    this.memoryUsed = (gpu.memoryUsed ?? 0) * 1024 * 1024;
    this.memoryTotal = (gpu.memoryTotal ?? 0) * 1024 * 1024;
    this.history = history;
  }

  private get normalizedVendorName(): string {
    const vendorLower = this.gpuVendor.toLowerCase();

    if (vendorLower.includes('amd')) {
      return 'AMD';
    }

    if (vendorLower.includes('nvidia')) {
      return 'Nvidia';
    }

    return '';
  }

  private get normalizedModelName(): string {
    const modelLower = this.gpuModel.toLowerCase();

    if (modelLower === 'raphael') {
      return 'iGPU Raphael';
    }

    if (modelLower.includes('radeon')) {
      const productName = /\[(.*)\]/.exec(this.gpuModel)?.[1] ?? '';

      // Statically move to RX 7800 XT for now
      if (productName.includes('7800 XT')) {
        return 'Radeon RX 7800 XT';
      }

      return productName || modelLower;
    }

    if (modelLower.includes('geforce')) {
      return 'GeForce';
    }

    return this.gpuModel;
  }

  private get gpuName(): string {
    return `${this.normalizedVendorName} ${this.normalizedModelName}`.trim();
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

  private get sparkValues() {
    return this.history.slice(-60).map((gpu) => gpu.utilizationGpu ?? 0);
  }

  render() {
    const { memoryTotal, memoryUsed, utilization } = this;

    const memoryPercentage = (memoryUsed / memoryTotal) * 100;

    return html`
      <om-bspark .values=${this.sparkValues} rows="4"></om-bspark>
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
                    y="15"
                    text-anchor="left"
                    alignment-baseline="middle"
                    dominant-baseline="central"
                  >
                     ${this.gpuTemperature}°C
                  </text>
                `
              : ''}
            ${this.gpuName !== ''
              ? svg`
                    <text
                      class="gpu-name"
                      x="50%"
                      y="0"
                      text-anchor="middle"
                      dominant-baseline="hanging"
                    >
                      ${this.gpuName}
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
    'om-gpu': OmGpu;
  }
}
