import { css } from 'lit';
import { keyframes } from '../../styles/keyframes';

export const hostStyles = css`
  ${keyframes}

  :host {
    flex: 1 1 0;
    overflow: hidden;
    container: host / inline-size;
  }

  :host(.offline) {
    opacity: 0.8;
    filter: grayscale();
  }

  .gauges {
    display: flex;
    gap: 0.5rem;
  }

  .gauges > * {
    flex: 1 1 0;
  }

  .host-title {
    display: flex;
    gap: 1ch;
  }

  .battery {
    margin-left: auto;
  }

  .critical {
    animation: pulse 1s infinite;
  }
`;
