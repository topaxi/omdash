import { css } from 'lit';

export const mountStyles = css`
  :host {
    display: block;
    font-size: 0.8rem;
    border-bottom: 1px solid var(--ctp-macchiato-overlay1);
  }

  .label {
    display: flex;
    justify-content: space-between;
  }

  meter {
    display: block;
    height: 0.75rem;
    width: 100%;
    background: none;
    border: 0;
  }

  meter::-moz-meter-bar {
    background: var(--ctp-macchiato-green);
  }

  meter.very-high::-moz-meter-bar {
    background: var(--ctp-macchiato-red);
  }

  meter.high::-moz-meter-bar {
    background: var(--ctp-macchiato-yellow);
  }

  meter::-webkit-meter-bar {
    background: none;
  }

  meter::-webkit-meter-optimum-value {
    background: var(--ctp-macchiato-green);
  }

  meter.very-high::-webkit-meter-optimum-value {
    background: var(--ctp-macchiato-red);
  }

  meter.high::-webkit-meter-suboptimum-value {
    background: var(--ctp-macchiato-yellow);
  }
`;
