import ApexCharts, { ApexOptions } from 'apexcharts';
import { LitElement, PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('om-line-graph')
export class OmLineGraph extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  private chart: ApexCharts | null = null;

  private index = 0;

  @property()
  range = 5;

  @property()
  series: Array<{ x: number, y: number }> = [{ x: 0, y: 0 }]

  @property({ type: Number }) dataPoint: number | undefined = undefined;

  override firstUpdated() {
    const options: ApexOptions = {
      // theme: { mode: 'dark' },
      series: [{ data: Array.from(this.series) }],
      chart: {
        type: 'line',
        height: 80,
        parentHeightOffset: 0,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: {
          enabled: true,
          easing: 'linear',
          dynamicAnimation: {
            speed: 5000,
          },
        },
        sparkline: { enabled: true },
      },
      grid: {
        show: false,
        padding: { top: 0, left: -10, bottom: 0, right: 0 },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      xaxis: {
        range: this.range,
        axisTicks: { show: false },
        labels: { show: false },
      },
      yaxis: {
        min: 0,
        max: 100,
        labels: { show: false },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      markers: { size: 0 },
      tooltip: { enabled: false },
    };

    this.chart = new ApexCharts(
      this.shadowRoot?.getElementById('chart'),
      options,
    );

    this.chart.render();
  }

  override willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('dataPoint') && this.dataPoint != null) {
      this.series.push({ x: ++this.index, y: this.dataPoint });

      if (this.series.length > this.range * 2) {
        this.series = this.series.slice(this.range);
      }
    }
  }

  override updated(_changedProperties: PropertyValues<this>) {
    this.chart?.updateSeries([{ data: Array.from(this.series) }]);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();

    this.chart?.destroy();
  }

  render() {
    return html`<div id="chart"></div>`;
  }
}
