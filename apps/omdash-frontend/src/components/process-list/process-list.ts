import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store/index.js';
import { processListStyles } from './process-list.styles.js';

@customElement('om-process-list')
export class OmProcessList extends connect()(LitElement) {
  static styles = processListStyles;

  @property()
  name = '';

  @state()
  private highestCPUProcesses: any[] = [];

  @state()
  private highestMemoryProcesses: any[] = [];

  override stateChanged(state: RootState): void {
    const ps = state.clients[this.name]?.ps;

    this.highestCPUProcesses = ps?.highestCpu ?? [];
    this.highestMemoryProcesses = ps?.highestMemory ?? [];
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

  private renderCpuProcess(p: any) {
    return html`<div class="process ${this.cpuHighUsageToClassName(p.cpu)}">
      <span class="percent">${this.formatPercent(p.cpu)}</span>
      <span>${p.name}</span>
    </div>`;
  }

  private renderMemoryProcess(p: any) {
    return html`<div
      class="process ${this.memoryHighUsageToClassName(p.memory)}"
    >
      <span class="percent">${this.formatPercent(p.memory)}</span>
      <span>${p.name}</span>
    </div>`;
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
          this.renderCpuProcess.bind(this),
        )}
      </div>
      <div class="process-list highest-memory">
        <strong>Memory</strong>
        ${repeat(
          this.highestMemoryProcesses,
          this.keyForProcess,
          this.renderMemoryProcess.bind(this),
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-process-list': OmProcessList;
  }
}
