import * as d3 from 'd3';
import { LitElement, PropertyValueMap, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

const MARGIN_LEFT = 24;

@customElement('om-line-graph')
export class OmLineGraph extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .axis path,
    .axis line {
      fill: none;
      stroke: #dddddd;
      shape-rendering: crispEdges;
    }

    .axis text {
      font: 10px sans-serif;
      fill: #dddddd;
    }
  `;

  @property({ type: Array })
  data: Array<{ color: string; values: { x: number; y: number }[] }> = [];

  @property()
  width = 100;

  @property()
  height = 100;

  @query('svg')
  svg!: SVGSVGElement;

  private d3svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g!: d3.Selection<SVGGElement, unknown, null, undefined>;

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    this.d3svg = d3.select(this.svg);
    this.g = this.d3svg.append('g');

    const xScale = this.createXScale();
    const yScale = this.createYScale();

    const xAxis = d3.axisBottom(xScale).tickSize(5);
    const yAxis = d3.axisLeft(yScale).tickSize(5);

    this.g
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0, ${0})`)
      .call(xAxis);
    this.g
      .append('g')
      .attr('class', 'axis y-axis')
      .attr('transform', `translate(${MARGIN_LEFT}, 0)`)
      .call(yAxis);
  }

  get allValues() {
    return this.data.flatMap((data) => data.values);
  }

  private createXScale() {
    return d3
      .scaleLinear()
      .range([MARGIN_LEFT, this.width])
      .domain([
        d3.min(this.allValues, (d) => d.x),
        d3.max(this.allValues, (d) => d.x),
      ] as [number, number]);
  }

  private createYScale() {
    return d3
      .scaleLinear()
      .range([this.height, 0])
      .domain([0, (d3.max(this.allValues, (d) => d.y) || 100) * 1.25] as [
        number,
        number,
      ]);
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (changedProperties.has('data')) {
      const xScale = this.createXScale();
      const yScale = this.createYScale();

      const yAxis = d3.axisLeft(yScale).tickSize(5);

      this.d3svg.selectAll('.y-axis').call(yAxis as any);

      const lineFn = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveMonotoneX);

      for (const [i, data] of this.data.entries()) {
        this.createOrUpdatePath(i, lineFn(data.values) as string, data.color);
      }

      this.cleanupPaths();
    }
  }

  private createOrUpdatePath(i: number, d: string, color: string) {
    const line = this.g.select(`.line-${i}`);

    if (line.empty()) {
      this.g
        .append('path')
        .attr('d', d)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .attr('class', `line line-${i}`);
    } else {
      line.attr('d', d).attr('stroke', color);
    }
  }

  private cleanupPaths() {
    const lines = this.g.selectAll('.line').size();

    if (lines > this.data.length) {
      this.g
        .selectAll('.line')
        .filter((d, i) => i >= this.data.length)
        .remove();
    }
  }

  protected render(): unknown {
    return html`<svg width=${this.width} height=${this.height}></svg>`;
  }
}
