import { css } from 'lit';

export const hostStyles = css`
  :host {
    flex: 1 1 0;
    max-width: calc(50% - 0.5rem);
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

  @keyframes pulse {
    0% {
      opacity: 1;
    }

    50% {
      opacity: 0.2;
    }

    100% {
      opacity: 1;
    }
  }

  .critical {
    animation: pulse 1s infinite;
  }
`;
