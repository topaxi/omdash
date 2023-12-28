import { css } from 'lit';
import { keyframes } from '../../../styles/keyframes';

export const hostButtonStyles = css`
  ${keyframes}

  :host {
    overflow: hidden;
    z-index: 0;
  }

  .cpu-usage,
  .memory-usage {
    position: absolute;
    top: 0;
    left: 0;
    height: 50%;
    opacity: 0.5;
  }

  .cpu-usage {
    background-color: var(--ctp-macchiato-red);
  }

  .memory-usage {
    top: 50%;
    background-color: var(--ctp-macchiato-mauve);
  }

  .critical {
    animation: pulse 1s infinite;
  }
`;
