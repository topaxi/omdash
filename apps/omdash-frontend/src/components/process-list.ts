import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { connect } from '../store/connect.js';
import { RootState } from '../store/index.js';

@customElement('om-process-list')
export class OmProcessList extends connect()(LitElement) {
  static styles = css`
    :host {
      display: flex;
      gap: 1rem;
      white-space: nowrap;

      -webkit-mask-image: linear-gradient(
        rgba(0, 0, 0, 1) 0 50%,
        rgba(0, 0, 0, 0.25)
      );
      mask-image: linear-gradient(rgba(0, 0, 0, 1) 0 50%, rgba(0, 0, 0, 0.25));
    }

    .process-list {
      flex: 0 0 50%;
      max-width: 50%;
    }

    .process {
      display: flex;
      gap: 1ch;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .very-high {
      color: var(--ctp-macchiato-red);
    }

    .high {
      color: var(--ctp-macchiato-maroon);
    }

    .medium {
      color: var(--ctp-macchiato-peach);
    }

    .low {
      color: var(--ctp-macchiato-yellow);
    }

    .very-low {
      color: var(--ctp-macchiato-green);
    }
  `;

  @property()
  name = '';

  @state()
  private highestCPUProcesses: any[] = [];

  @state()
  private highestMemoryProcesses: any[] = [];

  override stateChanged(state: RootState): void {
    this.highestCPUProcesses = state.clients[this.name]?.ps?.highestCpu ?? [];
    this.highestMemoryProcesses =
      state.clients[this.name]?.ps?.highestMemory ?? [];
  }

  private cpuHighUsageToClassName(usage: number) {
    if (usage > 90) {
      return 'very-high';
    } else if (usage > 75) {
      return 'high';
    } else if (usage > 50) {
      return 'medium';
    } else if (usage > 30) {
      return 'low';
    } else if (usage > 15) {
      return 'very-low';
    }

    return 'normal';
  }

  private memoryHighUsageToClassName(usage: number) {
    if (usage > 50) {
      return 'very-high';
    } else if (usage > 25) {
      return 'high';
    } else if (usage > 10) {
      return 'medium';
    } else if (usage > 5) {
      return 'low';
    } else if (usage > 2) {
      return 'very-low';
    }

    return 'normal';
  }

  private keyForProcess(process: any) {
    return process.pid;
  }

  private formatPercent(value: number) {
    return `${value.toFixed(1).padStart(4, '\u00A0')}%`;
  }

  render() {
    if (
      this.highestCPUProcesses.length === 0 &&
      this.highestMemoryProcesses.length === 0
    ) {
      return '';
    }

    return html`
      <div class="process-list highest-cpu">
        <strong>CPU</strong>
        ${repeat(
          this.highestCPUProcesses,
          this.keyForProcess,
          (p) =>
            html`<div class="process ${this.cpuHighUsageToClassName(p.cpu)}">
              <span class="percent">${this.formatPercent(p.cpu)}</span>
              <span>${p.name}</span>
            </div>`,
        )}
      </div>
      <div class="process-list highest-memory">
        <strong>Memory</strong>
        ${repeat(
          this.highestMemoryProcesses,
          this.keyForProcess,
          (p) =>
            html`<div
              class="process ${this.memoryHighUsageToClassName(p.memory)}"
            >
              <span class="percent">${this.formatPercent(p.memory)}</span>
              <span>${p.name}</span>
            </div>`,
        )}
      </div>
    `;
  }
}
