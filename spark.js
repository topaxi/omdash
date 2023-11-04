const GRAPH_SYMBOLS_UP = [
  [' ', '⢀', '⢠', '⢰', '⢸'],
  ['⡀', '⣀', '⣠', '⣰', '⣸'],
  ['⡄', '⣄', '⣤', '⣴', '⣼'],
  ['⡆', '⣆', '⣦', '⣶', '⣾'],
  ['⡇', '⣇', '⣧', '⣷', '⣿'],
];

// const GRAPH_SYMBOLS_DOWN = [
//   [' ', '⠈', '⠘', '⠸', '⢸'],
//   ['⠁', '⠉', '⠙', '⠹', '⢹'],
//   ['⠃', '⠋', '⠛', '⠻', '⢻'],
//   ['⠇', '⠏', '⠟', '⠿', '⣿'],
//   ['⠇', '⠏', '⠟', '⠿', '⣿'],
// ];

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function normalize(value, min, max) {
  return (value - min) / (max - min);
}

/**
 * @param {Iterable<number>} values
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number[]}
 */
function normalizeData(values, min, max) {
  min = min ?? Math.min(...values);
  max = max ?? Math.max(...values);

  return Array.from(values, (value) => normalize(value, min, max));
}

/**
 * @param {Iterable<number>} values
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number[]}
 */
function scaleData(values, min = 0, max = 1) {
  return Array.from(values, (value) => Math.round(value * (max - min) + min));
}

/**
 * @template {{ slice(start: number, end: number): unknown }} T
 * @param {T} arr
 * @param {number} size
 * @returns {T[]}
 */
function chunk(arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const SCALE = 4;

/**
 * @param {number[]} values
 * @param {number} row
 * @returns {void}
 */
function printSparkline(values, row) {
  const rowData = Uint8Array.from(values, (v) =>
    clamp(v - SCALE * row, 0, SCALE),
  );
  const chunkedData = chunk(rowData, 2);

  console.log(chunkedData.map(([a, b]) => GRAPH_SYMBOLS_UP[a][b]).join(''));
}

/**
 * @param {Iterable<number>} values
 * @param {number} rows
 * @returns {void}
 */
function printSparklines(values, rows) {
  const normalizedData = normalizeData(values);
  const scaledData = scaleData(normalizedData, 0, SCALE * rows);

  for (let i = rows - 1; i >= 0; i--) {
    printSparkline(scaledData, i);
  }
}

const rows = 3;
const randomData = Array.from({ length: 160 }, () => Math.random() * 100);

printSparklines(randomData, rows);
