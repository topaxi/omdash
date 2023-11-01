import { LitElement, PropertyValueMap, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import '../../components/box/box.js';
import '../../components/line-graph/line-graph.js';
import { OmLineGraph } from '../../components/line-graph/line-graph.js';
import { connect } from '../../store/connect.js';
import { RootState } from '../../store/index.js';
import { networkStyles } from './network.styles.js';

@customElement('om-network')
export class OmNetwork extends connect()(LitElement) {
  static styles = networkStyles;

  @query('.content')
  private accessor content!: HTMLDivElement | null;

  @query('om-line-graph')
  private accessor lineGraph!: OmLineGraph | null;

  private resizeObserver = new ResizeObserver(() => this.resizeGraph());

  disconnectedCallback(): void {
    super.disconnectedCallback();

    this.resizeObserver.disconnect();
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    this.resizeGraph();
    this.resizeObserver.observe(this.content!);
  }

  private resizeGraph() {
    const computedStyle = getComputedStyle(this.content!);

    this.lineGraph!.width =
      this.content!.clientWidth -
      parseFloat(computedStyle.paddingLeft) -
      parseFloat(computedStyle.paddingRight);
    this.lineGraph!.height =
      this.content!.clientHeight -
      parseFloat(computedStyle.paddingTop) -
      parseFloat(computedStyle.paddingBottom);
  }

  @state()
  data: Array<{
    host: string;
    addr: string;
    color: string;
    average: number;
    values: { x: number; y: number }[];
  }> = [];

  colors = [
    'var(--ctp-macchiato-green)',
    'var(--ctp-macchiato-red)',
    'var(--ctp-macchiato-blue)',
  ];

  stateChanged(state: RootState): void {
    this.data = Object.entries(state.pings).map(([host, pings], i) => ({
      host,
      addr: pings.at(-1)?.ip || '',
      color: this.colors[i % this.colors.length],
      average: Math.round(
        pings.reduce((acc, curr) => acc + curr.time, 0) / pings.length,
      ),
      values: pings.map((ping) => ({
        x: ping.timestamp,
        y: ping.time,
      })),
    }));
  }

  protected render(): unknown {
    return html`
      <om-box>
        <div class="content">
          <div class="legend">
            ${repeat(
              Array.from(this.data).sort((a, b) => b.average - a.average),
              (d) => d.host,
              (d) =>
                html`<div style="color: ${d.color}">
                  ${String(d.average).padStart(3, '\u00A0')}ms ${d.host}
                  (${d.addr})
                </div>`,
            )}
          </div>
          <om-line-graph .data=${this.data}></om-line-graph>
        </div>
      </om-box>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-network': OmNetwork;
  }
}
