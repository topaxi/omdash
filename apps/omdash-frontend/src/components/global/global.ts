import { type TypedArray } from 'd3';
import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ClockController } from '../../controllers/clock.js';

import '../link/link.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store/index.js';

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

@customElement('om-global-date')
export class OmGlobalDate extends LitElement {
  now = new ClockController(this, 60_000);

  protected render(): unknown {
    return new Date(this.now.value)
      .toLocaleDateString('de-CH', {
        day: '2-digit',
        month: 'short',
      })
      .slice(0, -1);
  }
}

function quantile(arr: TypedArray, q: number) {
  const sorted = arr.sort();

  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

@customElement('om-global-network-icon')
export class OmGlobalNetworkIcon extends connect()(LitElement) {
  static styles = css`
    :host {
      position: relative;
    }

    .high {
      color: var(--ctp-macchiato-red);
    }

    .medium {
      color: var(--ctp-macchiato-yellow);
    }

    .low {
      color: var(--ctp-macchiato-green);
    }

    .latest-ping {
      font-size: 0.3em;
      position: absolute;
      top: 1.3em;
      right: 1.2em;
      color: var(--ctp-macchiato-crust);
    }
  `;

  @state()
  private accessor networkQuality: 'high' | 'medium' | 'low' | 'verylow' =
    'verylow';

  @state()
  private latestPing: number | undefined;

  stateChanged(state: RootState): void {
    const pingTimings = Uint16Array.from(
      Object.values(state.pings)
        .flat()
        .sort((a, b) => b.timestamp - a.timestamp),
      (ping) => ping.time,
    );

    const q75 = quantile(pingTimings, 0.75);

    this.networkQuality =
      q75 > 200 ? 'high' : q75 > 100 ? 'medium' : q75 > 50 ? 'low' : 'verylow';
    this.latestPing = pingTimings.at(-1);
  }

  protected render(): unknown {
    return html`
      <om-app-icon class=${this.networkQuality} name="network-diagnostics">
        󰛳
      </om-app-icon>
      <span class="latest-ping">
        ${this.latestPing != null && this.latestPing > 1000
          ? `${(this.latestPing / 1000).toFixed(1)}s`
          : this.latestPing}
      </span>
    `;
  }
}

@customElement('om-global')
export class OmGlobal extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 0 0 5ch;
    }

    .icon-button {
      display: block;

      padding-left: 0.5rem;

      font-size: 4ch;

      opacity: 0.4;
    }

    om-global-date {
      font-size: 0.71rem;
    }

    om-link[aria-selected='true'] > .icon-button {
      opacity: 0.9;
    }
  `;

  protected override render(): unknown {
    return html`
      <om-global-clock></om-global-clock>
      <om-global-date></om-global-date>
      <om-link to="/">
        <om-app-icon class="icon-button" name="host-dashboard">󰊚</om-app-icon>
      </om-link>
      <om-link to="/network">
        <om-global-network-icon class="icon-button"></om-global-network-icon>
      </om-link>
      <om-link to="/spotify">
        <om-app-icon class="icon-button" name="spotify-controls">󰓇</om-app-icon>
      </om-link>
      <om-link to="/settings">
        <om-app-icon class="icon-button" name="settings">󰒓</om-app-icon>
      </om-link>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-global': OmGlobal;
    'om-global-clock': OmGlobalClock;
    'om-global-date': OmGlobalDate;
  }
}
