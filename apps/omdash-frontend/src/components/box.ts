import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('om-box')
export class OmBox extends LitElement {
  static styles = css`
    :host {
      display: block;
      border-radius: 6px;
      border: 1px solid var(--ctp-macchiato-lavender);
      background-color: rgb(var(--ctp-macchiato-base-raw), 66.6%);
      -webkit-backdrop-filter: blur(8px) grayscale(1) brightness(0.75);
      backdrop-filter: blur(8px) grayscale(1) brightness(0.75);

      padding: 0.2rem 0.33rem;
    }
  `;

  protected render(): unknown {
    return html`<slot></slot>`;
  }
}
