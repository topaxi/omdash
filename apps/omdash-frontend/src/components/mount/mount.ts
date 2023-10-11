import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mountStyles } from './mount.styles.js';

@customElement('om-mount')
export class OmMount extends LitElement {
  static styles = mountStyles;

  @property({ attribute: 'mount' })
  accessor mountPath = '';

  @property({ type: Number })
  accessor size = 0;

  @property({ type: Number })
  accessor used = 0;

  private formatBytes(bytes: number) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

    let unitIndex = 0;
    while (bytes > 1024) {
      bytes /= 1024;
      unitIndex++;
    }

    return `${bytes.toFixed(1)}${units[unitIndex]}`;
  }

  protected render() {
    const usedRatio = this.used / this.size;

    return html`
      <div class="label">
        <div class="mount-path">${this.mountPath}</div>
        <div class="text">
          ${this.formatBytes(this.used)} / ${this.formatBytes(this.size)}
        </div>
      </div>
      <meter
        class="${usedRatio > 0.9
          ? 'very-high'
          : usedRatio > 0.75
          ? 'high'
          : 'normal'}"
        min="0"
        max=${this.size}
        value=${this.used}
        optimum=${this.size * 0.5}
        high=${this.size * 0.8}
      ></meter>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-mount': OmMount;
  }
}
