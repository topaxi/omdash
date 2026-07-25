import { customElement, property } from 'lit/decorators.js';
import { ClockController } from '../../controllers/clock.js';
import { OmdashComponent } from '../../base/OmdashComponent.js';

function timeDifference(
  previous: number,
  current: number = Date.now(),
): string {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  const elapsed = current - previous;

  if (elapsed < 1000) {
    return `${elapsed} milliseconds ago`;
  }

  if (elapsed < msPerMinute) {
    return `${plural(elapsed / 1000, 'second')} ago`;
  } else if (elapsed < msPerHour) {
    return `${plural(elapsed / msPerMinute, 'minute')} ago`;
  } else if (elapsed < msPerDay) {
    return `${plural(elapsed / msPerHour, 'hour')} ago`;
  } else if (elapsed < msPerMonth) {
    return `approximately ${plural(elapsed / msPerDay, 'day')} ago`;
  } else if (elapsed < msPerYear) {
    return `approximately ${plural(elapsed / msPerMonth, 'month')} ago`;
  } else {
    return `approximately ${plural(elapsed / msPerYear, 'year')} ago`;
  }
}

function plural(value: number, unit: string) {
  const rounded = Math.round(value);

  return `${rounded} ${unit}${rounded === 1 ? '' : 's'}`;
}

@customElement('om-ago')
export class OmAgo extends OmdashComponent {
  @property({ type: Number })
  accessor date = 0;

  now = new ClockController(this, 1000);

  render() {
    return timeDifference(this.date, this.now.value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-ago': OmAgo;
  }
}
