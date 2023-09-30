import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('om-mount')
export class OmMount extends LitElement {
  static styles = css`
    :host {
      font-size: 0.8rem;
    }

    progress {
      display: block;
      height: 0.5rem;
    }
  `;

  @property({ attribute: 'mount' })
  mountPath = '';

  @property({ type: Number })
  size = 0;

  @property({ type: Number })
  used = 0;

  protected render() {
    return html`
      <div class="mount-path">${this.mountPath}</div>
      <progress min="0" max=${this.size} value=${this.used}></progress>
    `;
  }
}
