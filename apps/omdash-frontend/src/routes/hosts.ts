import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { RootState } from '../store';
import { connect } from '../store/connect';

import '../components/host.js';

const identity = <T>(value: T) => value;

@customElement('om-hosts')
export class Hosts extends connect()(LitElement) {
  static styles = css`
    :host {
      display: flex;
      gap: 0.5rem;
      flex-grow: 1;
    }
  `;

  @state()
  private hostNames: string[] = [];

  @state()
  private lastUpdatedHosts: Record<string, number> = {};

  override stateChanged(state: RootState) {
    this.hostNames = Object.keys(state.clients);

    this.lastUpdatedHosts = Object.fromEntries(
      Object.entries(state.clients).map(([client, { lastUpdate }]) => [
        client,
        lastUpdate,
      ]),
    );
  }

  private get activeHosts() {
    const now = Date.now();

    return this.hostNames.filter(
      (hostName) => now - (this.lastUpdatedHosts[hostName] || 0) < 300_000,
    );
  }

  /**
   * Alphabetically sorted list of active hosts. Prefer "ompi" over any other hosts.
   */
  private get sortedHosts(): string[] {
    return this.activeHosts.sort((a, b) => {

      if (a === 'ompi') {
        return -1;
      }

      if (b === 'ompi') {
        return 1;
      }

      return a.localeCompare(b);
    });
  }


  protected render(): unknown {
    return repeat(
      this.sortedHosts,
      identity,
      (hostName) => html` <om-host name=${hostName}></om-host> `,
    );
  }
}
