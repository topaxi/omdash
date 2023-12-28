import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../../store/connect.js';
import { hostButtonStyles } from './host-button.styles.js';
import { RootState } from '../../../store/index.js';
import {
  selectCPUHistory,
  selectMemoryHistory,
} from '../../../store/reducers/clients.selectors.js';
import { getAverageCPUUsageByHistory } from '../../../components/cpu/cpu.js';
import { classMap } from 'lit/directives/class-map.js';

@customElement('om-host-button')
export class HostButton extends connect()(LitElement) {
  static styles = hostButtonStyles;

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
      class=${classMap({
        'host-button': true,
        'critical': this.cpuUsage > 95 || this.memoryUsage > 80,
      })}
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

declare global {
  interface HTMLElementTagNameMap {
    'om-host-button': HostButton;
  }
}
