import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { bsparkStyles } from './bspark.styles';
import { OmdashComponent } from '../../base/OmdashComponent';

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

function scale(value: number, min: number, max: number): number {
  return value * (max - min) + min;
}

function scaleData(
  values: Iterable<number>,
  min: number = 0,
  max: number = 1,
): Uint8Array {
  return Uint8Array.from(values, (value) => Math.round(scale(value, min, max)));
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
  values: Iterable<number>,
  row: number,
  symbols = GRAPH_SYMBOLS_UP,
): string {
  const rowData = Uint8Array.from(values, (v) =>
    clamp(v - SCALE * row, 0, SCALE),
  );

  return chunk(rowData, 2)
    .map(([a, b]) => symbols[a][b])
    .join('');
}

function renderSparklines(
  values: Iterable<number>,
  min: number,
  max: number,
  rows: number,
  direction: 'up' | 'down' = 'up',
): string[] {
  const symbols = direction === 'up' ? GRAPH_SYMBOLS_UP : GRAPH_SYMBOLS_DOWN;
  const normalizedData = normalizeData(values, min, max);
  const scaledData = scaleData(normalizedData, 0, SCALE * rows);

  const lines: string[] = [];

  for (let i = rows - 1; i >= 0; i--) {
    lines.push(renderSparkline(scaledData, i, symbols));
  }

  return lines;
}

@customElement('om-bspark')
export class Bspark extends OmdashComponent {
  static styles = bsparkStyles;

  @property({ type: Array })
  values: number[] = [];

  @property({ type: Number })
  rows = 1;

  @property({ type: Number })
  min = 0;

  @property({ type: Number })
  max = 100;

  @property()
  direction: 'up' | 'down' = 'up';

  private renderCharacter(char: string) {
    return html`<span>${char}</span>`;
  }

  private renderLine(line: string) {
    const l = line;

    if (l.trim() === '') {
      return '';
    }

    return html`<div>${l.split('').map(this.renderCharacter, this)}</div>`;
  }

  render() {
    return renderSparklines(
      this.values,
      this.min,
      this.max,
      this.rows,
      this.direction,
    ).map(this.renderLine, this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-bspark': Bspark;
  }
}
