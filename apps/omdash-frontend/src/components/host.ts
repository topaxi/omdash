import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("om-host")
export class OmHost extends LitElement {
  static styles = css`
    :host {
      flex: 1 1 auto;
      border-radius: 6px;
      border: 1px solid var(--ctp-macchiato-lavender);
      background-color: var(--ctp-macchiato-base);

      padding: 0.2rem 0.33rem;
    }
  `;

  @property()
  name = "";

  render() {
    return html`
      <div class="hostname">${this.name}</div>
      <div class="latency">Latency: 0ms</div>
      <div class="last-update">Last Update: 0:00</div>
      <div class="uptime">Uptime: 0:00</div>
      <div class="cpu-usage">CPU: 0%</div>
      <div class="load-average">Load: 0.00 0.00 0.00</div>
      <div class="memory-usage">Memory: 0%</div>
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
