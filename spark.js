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

function normalize(value, min, max) {
  return (value - min) / (max - min);
}

function normalizeData(data, min, max) {
  min = min ?? Math.min(...data);
  max = max ?? Math.max(...data);

  return Array.from(data, (value) => normalize(value, min, max));
}

function scaleData(data, min = 0, max = 1) {
  return Array.from(data, (value) => Math.round(value * (max - min) + min));
}

const randomData = Array.from({ length: 20 }, () => Math.random() * 100);

const normalizedData = scaleData(normalizeData(randomData, 0, 100), 0, 4);

function chunk(arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
}

const chunkedData = chunk(normalizedData, 2);

console.log(chunkedData);

console.log(chunkedData.map(([a, b]) => GRAPH_SYMBOLS_UP[a][b]).join(''))
