import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../../components/box/box.js';
import { connect } from '../../store/connect.js';
import { settingsStyles } from './settings.styles.js';

@customElement('om-settings')
export class OmSettings extends connect()(LitElement) {
  static styles = settingsStyles;

  private refresh() {
    window.location.href = '/';
  }

  private reset() {
    this.store.dispatch({ type: 'REPLACE_STATE', payload: undefined });
  }

  protected render(): unknown {
    return html`
      <om-box class="content">
        <button @click=${this.refresh}>Refresh 󰑐</button>
        <button @click=${this.reset}>Reset 󰐷</button>
        <dl class="debug-info">
          <dt>Hardware Concurrency</dt>
          <dd>${window.navigator.hardwareConcurrency}</dd>
        </dl>
      </om-box>
    `;
  }
}
