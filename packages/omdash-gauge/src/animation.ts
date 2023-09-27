export interface AnimationOptions {
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
export function Animation(options: AnimationOptions) {
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
