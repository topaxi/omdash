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
    return `${Math.round(elapsed / 1000)} seconds ago`;
  } else if (elapsed < msPerHour) {
    return `${Math.round(elapsed / msPerMinute)} minutes ago`;
  } else if (elapsed < msPerDay) {
    return `${Math.round(elapsed / msPerHour)} hours ago`;
  } else if (elapsed < msPerMonth) {
    return `approximately ${Math.round(elapsed / msPerDay)} days ago`;
  } else if (elapsed < msPerYear) {
    return `approximately ${Math.round(elapsed / msPerMonth)} months ago`;
  } else {
    return `approximately ${Math.round(elapsed / msPerYear)} years ago`;
  }
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
