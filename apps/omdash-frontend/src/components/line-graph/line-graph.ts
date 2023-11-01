import * as d3 from 'd3';
import { LitElement, PropertyValueMap, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { lineGraphStyles } from './line-graph.styles.js';

const MARGIN_LEFT = 24;

const getx = <T>(d: { x: T }) => d.x;
const gety = <T>(d: { y: T }) => d.y;

@customElement('om-line-graph')
export class OmLineGraph extends LitElement {
  static styles = lineGraphStyles;

  @property({ type: Array })
  accessor data: Array<{ color: string; values: { x: number; y: number }[] }> =
    [];

  @property({ type: Number })
  accessor width = 100;

  @property({ type: Number })
  accessor height = 100;

  @query('svg')
  private accessor svg!: SVGSVGElement | null;

  private d3svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gl!: d3.Selection<SVGGElement, unknown, null, undefined>;

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    this.d3svg = d3.select(this.svg!);

    // X axis removed for now, will reconsider later
    // const xScale = this.createXScale();
    const yScale = this.createYScale();

    // const xAxis = d3.axisBottom(xScale).tickSize(5);
    const yAxis = d3.axisLeft(yScale).tickSize(5);

    this.d3svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('id', 'clip-rect')
      .attr('width', this.width)
      .attr('height', this.height);

    this.g = this.d3svg.append('g');

    // this.g
    //   .append('g')
    //   .attr('class', 'axis x-axis')
    //   .attr('clip-path', 'url(#clip)')
    //   .attr('transform', `translate(0, ${0})`)
    //   .call(xAxis);

    this.g
      .append('g')
      .attr('class', 'axis y-axis')
      .attr('transform', `translate(${MARGIN_LEFT}, 0)`)
      .call(yAxis);

    this.gl = this.g.append('g');
  }

  get allValues() {
    return this.data.flatMap((data) => data.values);
  }

  private createXScale() {
    return d3
      .scaleLinear()
      .range([MARGIN_LEFT, this.width])
      .domain([d3.min(this.allValues, getx), d3.max(this.allValues, getx)] as [
        number,
        number,
      ]);
  }

  private createYScale() {
    return d3
      .scaleLinear()
      .range([this.height, 0])
      .domain([0, (d3.max(this.allValues, gety) || 100) * 1.25] as [
        number,
        number,
      ]);
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (changedProperties.has('width') || changedProperties.has('height')) {
      this.d3svg
        .select('#clip-rect')
        .attr('width', this.width)
        .attr('height', this.height);
    }

    if (changedProperties.has('data')) {
      // TODO: Push the new data onto the old data, translate the lines to the left
      //       and then remove the old data.
      //       https://codepen.io/browles/pen/mPMBjw
      //       or
      //       https://embed.plnkr.co/plunk/yHpw7U
      const xScale = this.createXScale();
      const yScale = this.createYScale();

      const yAxis = d3.axisLeft(yScale).tickSize(5);

      this.d3svg.selectAll('.y-axis').call(yAxis as any);

      const lineFn = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(getx(d)))
        .y((d) => yScale(gety(d)))
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
      this.gl
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
        .filter((_d, i) => i >= this.data.length)
        .remove();
    }
  }

  protected render(): unknown {
    return html`<svg width=${this.width} height=${this.height}></svg>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-line-graph': OmLineGraph;
  }
}
