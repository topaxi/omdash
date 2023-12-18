import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { boxStyles } from './box.styles.js';

@customElement('om-box')
export class OmBox extends LitElement {
  static styles = boxStyles;

  @property({ type: Boolean })
  animated = false;

  @property({ type: Boolean })
  subtle = false;

  private get borderClass() {
    return classMap({
      animated: this.animated,
      subtle: this.subtle,
    });
  }

  protected render(): unknown {
    // prettier-ignore
    return html`<div part="border" class=${this.borderClass}><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-box': OmBox;
  }
}
