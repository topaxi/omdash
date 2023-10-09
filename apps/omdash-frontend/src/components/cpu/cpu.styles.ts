import { css } from 'lit';
import { keyframes } from '../../styles/keyframes';

export const cpuStyles = css`
  ${keyframes}

  :host {
    position: relative;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    min-width: 180px; /* To be defined, smaller makes temperature text barely readable, could be fixed with container query */
  }

  .load-average {
    display: flex;
    gap: 1ch;
    width: max-content;
    margin: 0 auto;
    text-align: center;
    font-size: 0.8rem;
  }

  .cpu-text-overlay {
    position: absolute;
    top: 0;
  }

  .cpu-speed {
    font-size: 0.4em;
    fill: var(--ctp-macchiato-red);
  }

  .cpu-temperature {
    font-size: 0.35em;
    fill: currentColor;
  }

  @container gauge (min-width: 200px) {
    .cpu-temperature {
      font-size: 0.3em;
    }
  }

  @container host (min-width: 330px) {
    .load-average {
      font-size: 1rem;
    }
  }

  .critical {
    animation: pulse 1s infinite;
  }

  .critical,
  .very-high {
    color: var(--ctp-macchiato-red);
  }

  .high {
    color: var(--ctp-macchiato-maroon);
  }

  .medium {
    color: var(--ctp-macchiato-peach);
  }

  .low {
    color: var(--ctp-macchiato-yellow);
  }

  .very-low {
    color: var(--ctp-macchiato-green);
  }
`;
