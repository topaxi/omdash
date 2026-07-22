import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from '../../../store/connect.js';
import { hostButtonStyles } from './host-button.styles.js';
import { RootState } from '../../../store/index.js';
import {
  selectCPULatest,
  selectCPUPrevious,
  selectMemoryLatest,
} from '../../../store/reducers/clients.selectors.js';
import { getAverageCPUUsageBetween } from '../../../store/reducers/cpu-usage.js';
import { classMap } from 'lit/directives/class-map.js';
import { OmdashComponent } from '../../../base/OmdashComponent.js';

@customElement('om-host-button')
export class HostButton extends connect()(OmdashComponent) {
  static styles = hostButtonStyles;

  @property()
  accessor hostname = '';

  @property({ type: Boolean })
  accessor subtle = false;

  @state()
  private accessor cpuUsages = [0, 0];

  @state()
  private accessor memoryUsage = 0;

  get cpuUsage() {
    return (this.cpuUsages[0] + this.cpuUsages[1]) / 2;
  }

  override stateChanged(state: RootState) {
    const client = state.clients[this.hostname];
    const cpuLatest = selectCPULatest(client);
    const cpuPrevious = selectCPUPrevious(client);
    const { total, available } = selectMemoryLatest(client) ?? {
      total: 1,
      available: 1,
    };
    const cpus = cpuLatest.length;

    if (cpus > 1) {
      this.cpuUsages = [
        Math.round(
          getAverageCPUUsageBetween(cpuPrevious, cpuLatest, (cpuInfo) =>
            cpuInfo.slice(0, cpus / 2),
          ),
        ),
        Math.round(
          getAverageCPUUsageBetween(cpuPrevious, cpuLatest, (cpuInfo) =>
            cpuInfo.slice(cpus / 2),
          ),
        ),
      ];
    } else {
      const cpuUsage = Math.round(
        getAverageCPUUsageBetween(cpuPrevious, cpuLatest),
      );

      this.cpuUsages = [cpuUsage, cpuUsage];
    }
    this.memoryUsage = Math.round(((total - available) / total) * 100);
  }

  protected render(): unknown {
    return html`<om-box
      .subtle=${this.subtle}
      part="host-button"
      class=${classMap({
        'host-button': true,
        'critical': this.cpuUsage > 95 || this.memoryUsage > 90,
      })}
    >
      <div
        part="cpu-usage0"
        class="cpu-usage0"
        style="width: ${this.cpuUsages[0]}%"
      ></div>
      <div
        part="cpu-usage1"
        class="cpu-usage1"
        style="width: ${this.cpuUsages[1]}%"
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
