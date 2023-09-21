import { css } from 'lit';

export const hostStyles = css`
  :host {
    overflow: hidden;
    container: host / size;
    contain: layout paint;
    max-width: 460px;
    box-sizing: border-box;
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

  .host-info {
    font-size: 0.8rem;
  }

  .host-title {
    display: flex;
    gap: 1ch;
  }

  .battery {
    margin-left: auto;
  }

  @container host (min-height: 180px) {
    .host-info {
      font-size: unset;
    }
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

  .processes {
    font-size: 0.8rem;
  }

  .critical {
    animation: pulse 1s infinite;
  }
`;
