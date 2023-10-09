import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mountStyles } from './mount.styles.js';

@customElement('om-mount')
export class OmMount extends LitElement {
  static styles = mountStyles;

  @property({ attribute: 'mount' })
  mountPath = '';

  @property({ type: Number })
  size = 0;

  @property({ type: Number })
  used = 0;

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
    return html`
      <div class="label">
        <div class="mount-path">${this.mountPath}</div>
        <div class="text">
          ${this.formatBytes(this.used)} / ${this.formatBytes(this.size)}
        </div>
      </div>
      <meter
        min="0"
        max=${this.size}
        value=${this.used}
        low=${this.size * 0.2}
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
