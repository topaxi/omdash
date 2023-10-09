import { css } from 'lit';
import { keyframes } from '../../styles/keyframes';

export const memoryStyles = css`
  ${keyframes}

  :host {
    min-width: 200px; /* Aligned with cpu styles */
  }

  .swap {
    /* Assumption that a system will rarely if ever reduce swap back to 0%,
      * we only care about fading in.
      */
    animation: fade-in 0.5s ease-in-out;
    width: 81.916575%;
    position: absolute;
    bottom: 1.5%;
    z-index: -1;

    --dial-stroke-width: 0;
    --stroke-width: 2;
    --text-transform: translateY(-1rem);
  }

  .memory-usage {
    position: relative;
    display: flex;
    justify-content: center;
  }

  .available-memory {
    display: flex;
    justify-content: center;
    font-size: 0.8rem;
  }

  .available-memory > span:last-child::before {
    content: '/';
  }

  .critical {
    animation: pulse 0.5s infinite ease-in-out;
  }

  @container host (min-width: 330px) {
    .available-memory {
      font-size: 1rem;
    }
  }
`;
