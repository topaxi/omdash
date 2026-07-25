import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import '../../components/ago/ago.js';
import '../../components/box/box.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store/index.js';
import {
  frontendVersion,
  shortCommit,
  type Version,
} from '../../store/reducers/version.js';
import { settingsStyles } from './settings.styles.js';
import { OmdashComponent } from '../../base/OmdashComponent.js';

@customElement('om-settings')
export class OmSettings extends connect()(OmdashComponent) {
  static styles = settingsStyles;

  @state()
  private accessor serverVersion: Version | undefined;

  override stateChanged(state: RootState): void {
    this.serverVersion = state.env.version;
  }

  private refresh() {
    window.location.href = '/';
  }

  private reset() {
    this.store.dispatch({ type: 'REPLACE_STATE', payload: undefined });
  }

  private renderVersion(version: Version | undefined | null) {
    if (!version) {
      return html`<span class="unknown">unknown</span>`;
    }

    return html`<span class="commit">${shortCommit(version)}</span>
      <om-ago class="age" date=${version.committedAt * 1000}></om-ago>`;
  }

  protected render(): unknown {
    return html`
      <om-box class="content">
        <div class="settings">
          <div class="actions">
            <button @click=${this.refresh}>Refresh 󰑐</button>
            <button @click=${this.reset}>Reset 󰐷</button>
          </div>
          <section>
            <h2>Versions</h2>
            <dl class="info">
              <dt>Frontend</dt>
              <dd>${this.renderVersion(frontendVersion)}</dd>
              <dt>Server</dt>
              <dd>${this.renderVersion(this.serverVersion)}</dd>
            </dl>
          </section>
          <section>
            <h2>Browser</h2>
            <dl class="info">
              <dt>Hardware Concurrency</dt>
              <dd>${window.navigator.hardwareConcurrency}</dd>
            </dl>
          </section>
        </div>
      </om-box>
    `;
  }
}
