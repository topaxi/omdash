import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const GRAPH_SYMBOLS_UP = [
  [' ', '⢀', '⢠', '⢰', '⢸'],
  ['⡀', '⣀', '⣠', '⣰', '⣸'],
  ['⡄', '⣄', '⣤', '⣴', '⣼'],
  ['⡆', '⣆', '⣦', '⣶', '⣾'],
  ['⡇', '⣇', '⣧', '⣷', '⣿'],
];

const GRAPH_SYMBOLS_DOWN = [
  [' ', '⠈', '⠘', '⠸', '⢸'],
  ['⠁', '⠉', '⠙', '⠹', '⢹'],
  ['⠃', '⠋', '⠛', '⠻', '⢻'],
  ['⠇', '⠏', '⠟', '⠿', '⣿'],
  ['⠇', '⠏', '⠟', '⠿', '⣿'],
];

function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

function normalizeData(
  values: Iterable<number>,
  min?: number,
  max?: number,
): number[] {
  min = min ?? Math.min(...values);
  max = max ?? Math.max(...values);

  return Array.from(values, (value) => normalize(value, min!, max!));
}

function scaleData(
  values: Iterable<number>,
  min: number = 0,
  max: number = 1,
): number[] {
  return Array.from(values, (value) => Math.round(value * (max - min) + min));
}

function chunk<
  T extends { length: number; slice(start: number, end: number): T },
>(arr: T, size: number): T[] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const SCALE = 4;

function renderSparkline(
  values: number[],
  row: number,
  direction: 'up' | 'down' = 'up',
): string {
  const rowData = Uint8Array.from(values, (v) =>
    clamp(v - SCALE * row, 0, SCALE),
  );
  const chunkedData = chunk(rowData, 2);
  const symbols = direction === 'up' ? GRAPH_SYMBOLS_UP : GRAPH_SYMBOLS_DOWN;

  return chunkedData.map(([a, b]) => symbols[a][b]).join('');
}

function renderSparklines(
  values: Iterable<number>,
  rows: number,
  direction: 'up' | 'down' = 'up',
): string[] {
  const normalizedData = normalizeData(values);
  const scaledData = scaleData(normalizedData, 0, SCALE * rows);

  const lines: string[] = [];

  for (let i = rows - 1; i >= 0; i--) {
    lines.push(renderSparkline(scaledData, i, direction));
  }

  return lines;
}

@customElement('om-bspark')
export class Bspark extends LitElement {
  @property({ type: Array })
  values: number[] = [];

  @property({ type: Number })
  rows = 1;

  @property()
  direction: 'up' | 'down' = 'up';

  private renderLine(line: string) {
    return html`<div>${line}</div>`;
  }

  render() {
    return renderSparklines(this.values, this.rows, this.direction).map(
      this.renderLine,
      this,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-bspark': Bspark;
  }
}
