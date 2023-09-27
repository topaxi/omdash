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

export type GaugeInstance = ReturnType<typeof Gauge>;
export const Gauge = (function() {
  /**
   * Creates a Gauge object. This should be called without the 'new' operator. Various options
   * can be passed for the gauge:
   * {
   *    dialStartAngle: The angle to start the dial. MUST be greater than dialEndAngle. Default 135deg
   *    dialEndAngle: The angle to end the dial. Default 45deg
   *    dialRadius: The gauge's radius. Default 400
   *    max: The maximum value of the gauge. Default 100
   *    value: The starting value of the gauge. Default 0
   *    label: The function on how to render the center label (Should return a value)
   * }
   * @param {Element} elem The DOM into which to render the gauge
   * @param {Object} options The gauge options
   * @return a Gauge object
   */
  return function Gauge(elem: HTMLElement | ShadowRoot, options: GaugeOptions) {
    let opts = { ...defaultOptions, ...options };
    let gaugeContainer = elem,
      limit = opts.max,
      min = opts.min,
      value = clamp(opts.value ?? 0, min ?? 0, limit ?? 0),
      radius = opts.dialRadius,
      displayValue = opts.showValue,
      startAngle = opts.dialStartAngle,
      endAngle = opts.dialEndAngle,
      valueDialClass = opts.valueDialClass,
      valueTextClass = opts.valueClass,
      dialClass = opts.dialClass,
      gaugeClass = opts.gaugeClass,
      gaugeColor = opts.gaugeColor,
      gaugeValueElem: SVGElement | null = null,
      gaugeValuePath: SVGElement | null = null,
      label = opts.label,
      viewBox = opts.viewBox,
      instance: any;

    if (startAngle < endAngle) {
      console.log('WARN! startAngle < endAngle, Swapping');
      const tmp = startAngle;
      startAngle = endAngle;
      endAngle = tmp;
    }

    function initializeGauge(elem: HTMLElement | ShadowRoot) {
      gaugeValueElem = svg('text', {
        'x': 50,
        'y': 50,
        'fill': '#999',
        'class': valueTextClass,
        'font-size': '100%',
        'font-family': 'sans-serif',
        'font-weight': 'normal',
        'text-anchor': 'middle',
        'alignment-baseline': 'middle',
        'dominant-baseline': 'central',
      });

      gaugeValuePath = svg('path', {
        'class': valueDialClass,
        'fill': 'none',
        'stroke': '#666',
        'stroke-width': 2.5,
        'd': pathString(radius, startAngle, startAngle, 1), // value of 0
      });

      const angle = getAngle(100, 360 - Math.abs(startAngle - endAngle));
      const flag = angle <= 180 ? 0 : 1;
      const gaugeElement = svg(
        'svg',
        { viewBox: viewBox || '0 0 100 100', class: gaugeClass },
        [
          svg('path', {
            'class': dialClass,
            'fill': 'none',
            'stroke': '#eee',
            'stroke-width': 2,
            'd': pathString(radius, startAngle, endAngle, flag),
          }),
          svg('g', { class: 'text-container' }, [gaugeValueElem]),
          gaugeValuePath,
        ],
      );
      elem.appendChild(gaugeElement);
    }

    function updateGauge(theValue: number) {
      const val = getValueInPercentage(theValue, min, limit),
        // angle = getAngle(val, 360 - Math.abs(endAngle - startAngle)),
        angle = getAngle(val, 360 - Math.abs(startAngle - endAngle)),
        // this is because we are using arc greater than 180deg
        flag = angle <= 180 ? 0 : 1;
      if (displayValue) {
        gaugeValueElem!.textContent = String(label(theValue));
      }
      gaugeValuePath!.setAttribute(
        'd',
        pathString(radius, startAngle, angle + startAngle, flag),
      );
    }

    function setGaugeColor(value: number, duration: number) {
      // Current code guards against gaugeColor being null
      const c = gaugeColor!(value),
        dur = duration * 1000,
        pathTransition = 'stroke ' + dur + 'ms ease';

      gaugeValuePath!.style.stroke = c;
      // @ts-ignore
      gaugeValuePath!.style['-webkit-transition'] = pathTransition;
      // @ts-ignore
      gaugeValuePath!.style['-moz-transition'] = pathTransition;
      gaugeValuePath!.style.transition = pathTransition;
    }

    instance = {
      setMaxValue(max: number) {
        limit = max;
        updateGauge(value);
      },
      setValue(val: number) {
        value = clamp(val, min, limit);
        if (gaugeColor) {
          setGaugeColor(value, 0);
        }
        updateGauge(value);
      },
      setValueAnimated(val: number, duration: number) {
        const oldVal = value;
        value = clamp(val, min, limit);
        if (oldVal === value) {
          return;
        }

        if (gaugeColor) {
          setGaugeColor(value, duration);
        }
        Animation({
          start: oldVal || 0,
          end: value,
          duration: duration || 1,
          step: updateGauge,
        });
      },
      getValue() {
        return value;
      },
    };

    initializeGauge(gaugeContainer);
    instance.setValue(value);
    return instance;
  };
})();
