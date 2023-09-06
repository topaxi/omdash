import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../components/box.js';
import '../components/time-series.js';

@customElement('om-network')
export class OmNetwork extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
  `;

  protected render(): unknown {
    return html`<om-box><om-time-series></om-time-series></om-box>`;
  }
}
