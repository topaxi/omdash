import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../components/box.js';

@customElement('om-settings')
export class OmSettings extends LitElement {
  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
    }

    .content {
      flex-grow: 1;
    }

    button {
      font: inherit;
      font-size: 4ch;
      padding: 0 1.25ch 0 1ch;
    }
  `;

  private refresh() {
    window.location.href = '/';
  }

  protected render(): unknown {
    return html`
      <om-box class="content">
        <button @click=${this.refresh}>󰑐</button>
      </om-box>
    `;
  }
}
