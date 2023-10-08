import { css } from 'lit';
import { keyframes } from '../../styles/keyframes';

export const cpuStyles = css`
  ${keyframes}

  :host {
    position: relative;
  }

  .load-average {
    display: flex;
    gap: 1ch;
    width: max-content;
    margin: 0 auto;
    text-align: center;
    font-size: 0.8rem;
  }

  .cpu-speed {
    position: absolute;
    top: 2.75em;
    font-size: 0.8rem;
    color: var(--ctp-macchiato-red);
  }

  .cpu-temperature {
    position: absolute;
    left: 0;
    font-size: 0.8rem;
  }

  om-gauge {
    width: 134px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
  }

  @container host (min-width: 330px) {
    om-gauge {
      width: 160px;
    }

    .cpu-speed {
      font-size: 1rem;
    }

    .cpu-temperature {
      top: 0.5rem;
    }

    .load-average {
      font-size: 1rem;
    }
  }

  @container host (min-width: 420px) {
    om-gauge {
      width: 220px;
    }

    .cpu-speed {
      top: 4em;
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
