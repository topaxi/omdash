import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { ClockController } from '../../controllers/clock.js';
import { RootState } from '../../store/index.js';
import { connect } from '../../store/connect.js';
import { mapEntries } from '../../utils/object/mapEntries.js';
import { bind } from '../../decorators/bind.js';

import '../../components/box/box.js';
import '../../components/host/host.js';
import { hostsStyles } from './hosts.styles.js';
import {
  selectCPUHistory,
  selectMemoryHistory,
} from '../../store/reducers/clients.selectors.js';
import { getAverageCPUUsageByHistory } from '../../components/cpu/cpu.js';

const identity = <T>(value: T) => value;

@customElement('om-host-button')
export class HostButton extends connect()(LitElement) {
  static styles = css`
    :host {
      overflow: hidden;
      z-index: 0;
    }

    .cpu-usage,
    .memory-usage {
      position: absolute;
      top: 0;
      left: 0;
      height: 50%;
      opacity: 0.5;
    }

    .cpu-usage {
      background-color: var(--ctp-macchiato-red);
    }

    .memory-usage {
      top: 50%;
      background-color: var(--ctp-macchiato-mauve);
    }
  `;

  @property()
  accessor hostname = '';

  @property({ type: Boolean })
  accessor subtle = false;

  @state()
  private accessor cpuUsage = 0;

  @state()
  private accessor memoryUsage = 0;

  override stateChanged(state: RootState) {
    const client = state.clients[this.hostname];
    const cpuHistory = selectCPUHistory(client);
    const memoryHistory = selectMemoryHistory(client);
    const { total, available } = memoryHistory.at(-1) ?? {
      total: 1,
      available: 1,
    };

    this.cpuUsage = Math.round(getAverageCPUUsageByHistory(cpuHistory));
    this.memoryUsage = Math.round(((total - available) / total) * 100);
  }

  protected render(): unknown {
    return html`<om-box
      .subtle=${this.subtle}
      part="host-button"
      class="host-button"
    >
      <div
        part="cpu-usage"
        class="cpu-usage"
        style="width: ${this.cpuUsage}%"
      ></div>
      <div
        part="memory-usage"
        class="memory-usage"
        style="width: ${this.memoryUsage}%"
      ></div>
      <slot></slot>
    </om-box>`;
  }
}

@customElement('om-hosts')
export class Hosts extends connect()(LitElement) {
  static styles = hostsStyles;

  private now = new ClockController(this, 5000);

  @state()
  private accessor hostnames: string[] = [];

  @state()
  private accessor selectedHosts: string[] = [];

  @state()
  private accessor lastUpdatedHosts: Record<string, number> = {};

  override stateChanged(state: RootState) {
    this.hostnames = Object.keys(state.clients);
    this.selectedHosts = state.ui.hosts.selectedHosts;

    this.lastUpdatedHosts = mapEntries(
      state.clients,
      ([hostname, { lastUpdate }]) => [hostname, lastUpdate],
    );
  }

  private filterByActiveHosts(hostnames: string[]) {
    return hostnames.filter((hostname) => this.activeHosts.includes(hostname));
  }

  private get activeHosts() {
    const now = this.now.value;

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

  private renderSelectedHost(hostname: string) {
    return html`
      <om-box data-hostname=${hostname}>
        <om-host hostname=${hostname}></om-host>
      </om-box>
    `;
  }

  protected renderSelectedHosts(): unknown {
    return repeat(
      this.filterByActiveHosts(this.selectedHosts),
      identity,
      this.renderSelectedHost,
    );
  }

  @bind()
  private renderHost(hostname: string) {
    return html`
      <om-host-button
        data-hostname=${hostname}
        .hostname=${hostname}
        .subtle=${!this.selectedHosts.includes(hostname)}
        @click=${this.handleHostClick}
      >
        ${hostname}
      </om-host-button>
    `;
  }

  private handleHostClick(event: MouseEvent) {
    const { hostname } = (event.target as HTMLElement).dataset;

    this.dispatch({
      type: 'ui/hosts/toggleSelectedHost',
      payload: hostname,
    });
  }

  private renderHosts() {
    return repeat(this.sortedHosts, identity, this.renderHost);
  }

  protected render(): unknown {
    return html`
      <div part="host-list" class="host-list">${this.renderHosts()}</div>
      <div part="selected-hosts" class="selected-hosts">
        ${this.renderSelectedHosts()}
      </div>
    `;
  }
}
