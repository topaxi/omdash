import { css } from 'lit';
import { keyframes } from '../../../styles/keyframes';

export const hostButtonStyles = css`
  ${keyframes}

  :host {
    overflow: hidden;
    z-index: 0;
  }

  .cpu-usage0,
  .cpu-usage1,
  .memory-usage {
    position: absolute;
    top: 0;
    left: 0;
    height: 25%;
    opacity: 0.5;
  }

  .cpu-usage0,
  .cpu-usage1 {
    background-color: var(--ctp-macchiato-red);
  }

  .cpu-usage1 {
    top: 25%;
  }

  .memory-usage {
    top: 50%;
    height: 50%;
    background-color: var(--ctp-macchiato-mauve);
  }

  .critical {
    animation: pulse 1s infinite;
  }
`;
