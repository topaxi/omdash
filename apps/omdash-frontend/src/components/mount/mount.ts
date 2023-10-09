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

  protected render() {
    return html`
      <div class="mount-path">${this.mountPath}</div>
      <meter min="0" max=${this.size} value=${this.used}></meter>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-mount': OmMount;
  }
}
