/* eslint-disable prefer-const */
// Based on https://github.com/naikus/svg-gauge

interface AnimationOptions {
  duration: number;
  start: number;
  end: number;
  step: (value: number, currentIteration: number) => void;
  easing?: (pos: number) => number;
}

function easeInOutCubic(pos: number) {
  // https://github.com/danro/easing-js/blob/master/easing.js
  if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 3);
  return 0.5 * (Math.pow(pos - 2, 3) + 2);
}

/**
 * Simplistic animation function for animating the gauge. That's all!
 * Options are:
 * {
 *  duration: 1,    // In seconds
 *  start: 0,       // The start value
 *  end: 100,       // The end value
 *  step: function, // REQUIRED! The step function that will be passed the value and does something
 *  easing: function // The easing function. Default is easeInOutCubic
 * }
 */
function Animation(options: AnimationOptions) {
  let currentIteration = 1;

  const duration = options.duration;
  const iterations = 60 * duration;
  const start = options.start || 0;
  const end = options.end;
  const change = end - start;
  const step = options.step;
  const easing = options.easing || easeInOutCubic;

  function animate() {
    const progress = currentIteration / iterations;
    const value = change * easing(progress) + start;

    step(value, currentIteration);
    currentIteration += 1;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  // start!
  requestAnimationFrame(animate);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

const GaugeDefaults = {
  centerX: 50,
  centerY: 50,
};

const defaultOptions = {
  dialRadius: 40,
  dialStartAngle: 135,
  dialEndAngle: 45,
  value: 0,
  max: 100,
  min: 0,
  valueDialClass: 'value',
  valueClass: 'value-text',
  dialClass: 'dial',
  gaugeClass: 'gauge',
  showValue: true,
  gaugeColor: null,
  label: function(val: number) {
    return Math.round(val);
  },
};

/**
 * A utility function to create SVG dom tree
 * @param {String} name The SVG element name
 * @param {Object} attrs The attributes as they appear in DOM e.g. stroke-width and not strokeWidth
 * @param {Array} children An array of children (can be created by this same function)
 * @return The SVG element
 */
function svg(
  name: string,
  attrs: Record<string, string | number>,
  children?: Node[],
) {
  const elem = document.createElementNS(SVG_NS, name);

  for (const [attrName, attrValue] of Object.entries(attrs)) {
    elem.setAttribute(attrName, String(attrValue));
  }

  if (children != null) {
    for (const c of children) {
      elem.appendChild(c);
    }
  }

  return elem;
}

/**
 * Translates percentage value to angle. e.g. If gauge span angle is 180deg, then 50%
 * will be 90deg
 */
function getAngle(percentage: number, gaugeSpanAngle: number) {
  return (percentage * gaugeSpanAngle) / 100;
}

function clamp(value: number, min: number, limit: number) {
  const val = Number(value);
  if (val > limit) return limit;
  if (val < min) return min;
  return val;
}

function getValueInPercentage(value: number, min: number, max: number) {
  const newMax = max - min;
  const newVal = value - min;

  return (100 * newVal) / newMax;
}

/**
 * Gets cartesian co-ordinates for a specified radius and angle (in degrees)
 * @param cx {Number} The center x co-oriinate
 * @param cy {Number} The center y co-ordinate
 * @param radius {Number} The radius of the circle
 * @param angle {Number} The angle in degrees
 * @return An object with x,y co-ordinates
 */
function getCartesian(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;

  return {
    x: Math.round((cx + radius * Math.cos(rad)) * 1000) / 1000,
    y: Math.round((cy + radius * Math.sin(rad)) * 1000) / 1000,
  };
}

// Returns start and end points for dial
// i.e. starts at 135deg ends at 45deg with large arc flag
// REMEMBER!! angle=0 starts on X axis and then increases clockwise
function getDialCoords(radius: number, startAngle: number, endAngle: number) {
  const { centerX, centerY } = GaugeDefaults;

  return {
    end: getCartesian(centerX, centerY, radius, endAngle),
    start: getCartesian(centerX, centerY, radius, startAngle),
  };
}

function pathString(
  radius: number,
  startAngle: number,
  endAngle: number,
  largeArc: 0 | 1,
) {
  const { start, end } = getDialCoords(radius, startAngle, endAngle);

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArc,
    1,
    end.x,
    end.y,
  ].join(' ');
}

export interface GaugeOptions {
  dialRadius?: number;
  dialStartAngle?: number;
  dialEndAngle?: number;
  value?: number;
  max?: number;
  min?: number;
  valueDialClass?: string;
  valueClass?: string;
  dialClass?: string;
  gaugeClass?: string;
  showValue?: boolean;
  gaugeColor?: ((value: number) => string) | null;
  label?: (value: number) => string | number;
  viewBox?: string;
}

export class Gauge {
  private gaugeContainer: HTMLElement | ShadowRoot;
  private limit: number;
  private min: number;
  private value: number;
  private radius: number;
  private displayValue: boolean;
  private startAngle: number;
  private endAngle: number;
  private valueDialClass: string;
  private valueTextClass: string;
  private dialClass: string;
  private gaugeClass: string;
  private gaugeColor: ((value: number) => string) | null;
  private gaugeValueElem: SVGElement | null = null;
  private gaugeValuePath: SVGElement | null = null;
  private label: (value: number) => string | number;
  private viewBox: string | undefined;

  constructor(elem: HTMLElement | ShadowRoot, options: GaugeOptions) {
    const opts = { ...defaultOptions, ...options };

    this.gaugeContainer = elem;
    this.limit = opts.max!;
    this.min = opts.min!;
    this.value =
      opts.value != null ? clamp(opts.value, this.min, this.limit) : 0;
    this.radius = opts.dialRadius!;
    this.displayValue = opts.showValue!;
    this.startAngle = opts.dialStartAngle!;
    this.endAngle = opts.dialEndAngle!;
    this.valueDialClass = opts.valueDialClass!;
    this.valueTextClass = opts.valueClass!;
    this.dialClass = opts.dialClass!;
    this.gaugeClass = opts.gaugeClass!;
    this.gaugeColor = opts.gaugeColor!;
    this.label = opts.label!;
    this.viewBox = opts.viewBox;

    if (this.startAngle < this.endAngle) {
      console.log('WARN! startAngle < endAngle, Swapping');
      const tmp = this.startAngle;
      this.startAngle = this.endAngle;
      this.endAngle = tmp;
    }

    this.initializeGauge(this.gaugeContainer);
    this.setValue(this.value);
  }

  private initializeGauge(elem: HTMLElement | ShadowRoot): void {
    this.gaugeValueElem = svg('text', {
      'x': 50,
      'y': 50,
      'fill': '#999',
      'class': this.valueTextClass,
      'font-size': '100%',
      'font-family': 'sans-serif',
      'font-weight': 'normal',
      'text-anchor': 'middle',
      'alignment-baseline': 'middle',
      'dominant-baseline': 'central',
    });

    this.gaugeValuePath = svg('path', {
      'class': this.valueDialClass,
      'fill': 'none',
      'stroke': '#666',
      'stroke-width': 2.5,
      'd': pathString(this.radius, this.startAngle, this.startAngle, 1), // value of 0
    });

    const angle = getAngle(
      100,
      360 - Math.abs(this.startAngle - this.endAngle),
    );
    const flag = angle <= 180 ? 0 : 1;
    const gaugeElement = svg(
      'svg',
      { viewBox: this.viewBox || '0 0 100 100', class: this.gaugeClass },
      [
        svg('path', {
          'class': this.dialClass,
          'fill': 'none',
          'stroke': '#eee',
          'stroke-width': 2,
          'd': pathString(this.radius, this.startAngle, this.endAngle, flag),
        }),
        svg('g', { class: 'text-container' }, [this.gaugeValueElem]),
        this.gaugeValuePath,
      ],
    );
    elem.appendChild(gaugeElement);
  }

  private updateGauge(theValue: number): void {
    const val = getValueInPercentage(theValue, this.min, this.limit);
    const angle = getAngle(
      val,
      360 - Math.abs(this.startAngle - this.endAngle),
    );
    const flag = angle <= 180 ? 0 : 1;

    if (this.displayValue) {
      this.gaugeValueElem!.textContent = String(this.label(theValue));
    }
    this.gaugeValuePath!.setAttribute(
      'd',
      pathString(this.radius, this.startAngle, angle + this.startAngle, flag),
    );
  }

  private setGaugeColor(value: number, duration: number): void {
    const c = this.gaugeColor!(value);
    const dur = duration * 1000;
    const pathTransition = 'stroke ' + dur + 'ms ease';

    this.gaugeValuePath!.style.stroke = c;
    // @ts-ignore
    this.gaugeValuePath!.style['-webkit-transition'] = pathTransition;
    // @ts-ignore
    this.gaugeValuePath!.style['-moz-transition'] = pathTransition;
    this.gaugeValuePath!.style.transition = pathTransition;
  }

  setMaxValue(max: number): void {
    this.limit = max;
    this.updateGauge(this.value);
  }

  setValue(val: number): void {
    this.value = clamp(val, this.min, this.limit);
    if (this.gaugeColor != null) {
      this.setGaugeColor(this.value, 0);
    }
    this.updateGauge(this.value);
  }

  setValueAnimated(val: number, duration: number): void {
    const oldVal = this.value;
    this.value = clamp(val, this.min, this.limit);
    if (oldVal === this.value) {
      return;
    }

    if (this.gaugeColor != null) {
      this.setGaugeColor(this.value, duration);
    }

    Animation({
      start: oldVal || 0,
      end: this.value,
      duration: duration || 1,
      step: this.updateGauge.bind(this),
    });
  }

  getValue(): number {
    return this.value;
  }
}
