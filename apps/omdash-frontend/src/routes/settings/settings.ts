import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../../components/box/box.js';
import { settingsStyles } from './settings.styles.js';

@customElement('om-settings')
export class OmSettings extends LitElement {
  static styles = settingsStyles;

  private refresh() {
    window.location.href = '/';
  }

  protected render(): unknown {
    return html`
      <om-box class="content">
        <button @click=${this.refresh}>󰑐</button>
        <dl class="debug-info">
          <dt>Hardware Concurrency</dt>
          <dd>${window.navigator.hardwareConcurrency}</dd>
        </dl>
      </om-box>
    `;
  }
}
