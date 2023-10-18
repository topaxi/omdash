import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { boxStyles } from './box.styles.js';

@customElement('om-box')
export class OmBox extends LitElement {
  static styles = boxStyles;

  @property({ type: Boolean })
  animated = false;

  protected render(): unknown {
    // prettier-ignore
    return html`<div part="border" class=${this.animated ? 'animated' : ''}><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-box': OmBox;
  }
}
