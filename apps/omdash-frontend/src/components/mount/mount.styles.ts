import { css } from 'lit';

export const mountStyles = css`
  :host {
    font-size: 0.8rem;
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
    border-bottom: 1px solid var(--ctp-macchiato-overlay1);
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
    background: var(--ctp-macchiato-green);
  }

  meter.very-high::-webkit-meter-bar {
    background: var(--ctp-macchiato-red);
  }

  meter.high::-webkit-meter-bar {
    background: var(--ctp-macchiato-yellow);
  }
`;
