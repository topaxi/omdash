import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { connect } from "../store/connect.js";
import { RootState } from "../store/index.js";

import './ago.ts';

@customElement("om-host")
export class OmHost extends connect()(LitElement) {
  static styles = css`
    :host {
      flex: 1 0 0px;
      border-radius: 6px;
      border: 1px solid var(--ctp-macchiato-lavender);
      background-color: var(--ctp-macchiato-base);

      padding: 0.2rem 0.33rem;
    }
  `;

  @property()
  name = "";

  @state()
  private lastUpdate = Date.now();

  @state()
  private loadAverage: [number, number, number] = [0, 0, 0];

  @state()
  private memory = { total: 1, free: 1 };

  override stateChanged(state: RootState): void {
    this.loadAverage = state.clients[this.name]?.load ?? [0, 0, 0];
    this.memory = state.clients[this.name]?.memory ?? { total: 1, free: 1 };
    this.lastUpdate = state.clients[this.name]?.lastUpdate || this.lastUpdate
  }

  private renderLastUpdate() {
    return html`
      <div class="last-update">Last Update: <om-ago date="${this.lastUpdate}"></om-ago></div>
    `;
  }

  private renderLoadAverage() {
    return html`
      <div class="load-average">Load: ${this.loadAverage.map(n => n.toFixed(2)).join(" ")}</div>
    `;
  }

  private renderMemoryUsage() {
    const memoryPercentage = (
      ((this.memory.total - this.memory.free) / this.memory.total) * 100);
    return html`
      <div class="memory-usage">Memory usage: ${memoryPercentage.toFixed(1)}%</div>
    `;
  }

  render() {
    return html`
      <div class="hostname">${this.name}</div>
      <div class="latency">Latency: 0ms</div>
      ${this.renderLastUpdate()}
      <div class="uptime">Uptime: 0:00</div>
      <div class="cpu-usage">CPU: 0%</div>
      ${this.renderLoadAverage()}
      ${this.renderMemoryUsage()}
      <div class="disk-usage">Disk: 0%</div>
      <div class="network-usage">Network: 0%</div>
      <div class="processes">Processes: 0</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "om-host": OmHost;
  }
}
