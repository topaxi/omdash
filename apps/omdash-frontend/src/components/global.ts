import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ClockController } from '../controllers/clock.js';

import './link.js';

@customElement('om-global-clock')
export class OmGlobalClock extends LitElement {
  now = new ClockController(this, 5000);

  protected render(): unknown {
    return new Date(this.now.value).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

@customElement('om-global')
export class OmGlobal extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 0 0 5ch;
      border-radius: 6px;
      border: 1px solid var(--ctp-macchiato-lavender);
      background-color: rgb(var(--ctp-macchiato-base-raw), 66.6%);
      -webkit-backdrop-filter: blur(8px) grayscale(1);
      backdrop-filter: blur(8px) grayscale(1);

      padding: 0.2rem 0.33rem;
    }

    om-app-icon {
      display: block;

      padding-left: 0.5rem;

      font-size: 4ch;

      opacity: 0.4;
    }

    om-link[aria-selected='true'] om-app-icon {
      opacity: 0.9;
    }
  `;

  protected override render(): unknown {
    return html`
      <om-global-clock></om-global-clock>
      <om-link to="/">
        <om-app-icon name="host-dashboard">󰊚</om-app-icon>
      </om-link>
      <om-link to="/network">
        <om-app-icon name="network-diagnostics">󰛳</om-app-icon>
      </om-link>
      <om-link to="/spotify">
        <om-app-icon name="spotify-controls">󰓇</om-app-icon>
      </om-link>
      <om-link to="/settings">
        <om-app-icon name="settings">󰒓</om-app-icon>
      </om-link>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-global': OmGlobal;
    'om-global-clock': OmGlobalClock;
  }
}
