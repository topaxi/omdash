import { html, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store/index.js';
import { gpuStyles } from './gpu.styles.js';
import { formatBytes } from '../../utils/format/formatBytes.js';

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
  private accessor utilizationSeries: number[] = [];

  override stateChanged(state: RootState) {
    const gpus = state.clients[this.hostname]?.gpus;
    const gpu = gpus?.latest[this.gpuIndex];

    if (!gpu) {
      return;
    }

    this.gpuVendor = gpu.vendor ?? '';
    this.gpuModel = gpu.model ?? '';
    this.gpuTemperature = gpu.temperatureGpu ?? 0;
    this.utilization = gpu.utilizationGpu ?? 0;
    this.memoryUsed = (gpu.memoryUsed ?? 0) * 1024 * 1024;
    this.memoryTotal = (gpu.memoryTotal ?? 0) * 1024 * 1024;
    this.utilizationSeries = gpus.utilization[this.gpuIndex] ?? [];
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
    const model = this.gpuModel.trim();

    // Falls back to the raw PCI id when the client couldn't resolve a name.
    if (model.toLowerCase() === 'raphael') {
      return 'iGPU Raphael';
    }

    // pci.ids-style names carry the marketing name in brackets, e.g.
    // "Navi 32 [Radeon RX 7700 XT / 7800 XT]" or "AD104 [GeForce RTX 4070]".
    const bracketed = /\[(.*)\]/.exec(model)?.[1];
    if (bracketed) {
      return bracketed;
    }

    // Otherwise the client already resolved an exact marketing name (e.g.
    // "Radeon RX 7800 XT" from amdgpu.ids). Drop a redundant leading vendor
    // word, since the vendor is rendered separately by normalizedVendorName.
    return model.replace(/^(AMD|NVIDIA|Intel)\s+/i, '');
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
    return this.utilizationSeries;
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
