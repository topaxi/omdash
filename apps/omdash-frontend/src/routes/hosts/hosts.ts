import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { RootState } from '../../store/index.js';
import { connect } from '../../store/connect.js';

import '../../components/host/host.js';
import { hostsStyles } from './hosts.styles.js';

const identity = <T>(value: T) => value;

@customElement('om-hosts')
export class Hosts extends connect()(LitElement) {
  static styles = hostsStyles;

  @state()
  private hostnames: string[] = [];

  @state()
  private lastUpdatedHosts: Record<string, number> = {};

  override stateChanged(state: RootState) {
    this.hostnames = Object.keys(state.clients);

    this.lastUpdatedHosts = Object.fromEntries(
      Object.entries(state.clients).map(([client, { lastUpdate }]) => [
        client,
        lastUpdate,
      ]),
    );
  }

  private get activeHosts() {
    const now = Date.now();

    return this.hostnames.filter(
      (hostname) => now - (this.lastUpdatedHosts[hostname] || 0) < 300_000,
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
      (hostname) => html`<om-host hostname=${hostname}></om-host>`,
    );
  }
}
