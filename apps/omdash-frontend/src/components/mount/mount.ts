import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mountStyles } from './mount.styles.js';
import { formatBytes } from '../../utils/format/formatBytes.js';
import { OmdashComponent } from '../../base/OmdashComponent.js';

@customElement('om-mount')
export class OmMount extends OmdashComponent {
  static styles = mountStyles;

  @property({ attribute: 'mount' })
  accessor mountPath = '';

  @property({ type: Number })
  accessor size = 0;

  @property({ type: Number })
  accessor used = 0;

  protected render() {
    const usedRatio = this.used / this.size;

    return html`
      <div class="label">
        <div class="mount-path">${this.mountPath}</div>
        <div class="text">
          ${formatBytes(this.used)} / ${formatBytes(this.size)}
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
        optimum=${Math.floor(this.size * 0.5)}
        high=${Math.floor(this.size * 0.8)}
      ></meter>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-mount': OmMount;
  }
}
