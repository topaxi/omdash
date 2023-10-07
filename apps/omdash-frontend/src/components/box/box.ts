import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { boxStyles } from './box.styles.js';

@customElement('om-box')
export class OmBox extends LitElement {
  static styles = boxStyles;

  protected render(): unknown {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-box': OmBox;
  }
}
