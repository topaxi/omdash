import { LitElement, css, html } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import * as Plotly from 'plotly.js';

@customElement('om-time-series')
export class OmTimeSeries extends LitElement {
  static styles = css`
    :host {
      display: block;

      width: 100%;
      height: 100%;
    }
  `;

  @query('.plot-root')
  // @ts-ignore
  private plotRoot: HTMLDivElement;

  firstUpdated(): void {
    Plotly.newPlot(
      this.plotRoot,
      [
        {
          x: Array.from({ length: 100 }, (_, i) => i),
          y: Array.from({ length: 100 }, () => Math.random()),
          mode: 'lines',
          type: 'scatter',
        },
        {
          x: Array.from({ length: 100 - 2 }, (_, i) => i),
          y: Array.from({ length: 100 - 2 }, () => Math.random()),
          mode: 'lines',
          type: 'scatter',
        },
      ],
      {
        height: 376,
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 0, r: 0, b: 16, l: 24 },
        showlegend: false,
        xaxis: {
          visible: false,
        },
        yaxis: {
          color: '#fff',
        },
      },
      { responsive: true, staticPlot: true },
    );
  }

  protected render(): unknown {
    return html`<div class="plot-root"></div>`;
  }
}
