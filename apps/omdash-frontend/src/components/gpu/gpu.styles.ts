import { css } from 'lit';
import { keyframes } from '../../styles/keyframes';

export const gpuStyles = css`
  ${keyframes}

  :host {
    min-width: 180px; /* Aligned with cpu styles */
  }

  .memory {
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

  .gpu-text-overlay {
    position: absolute;
    top: 0;
  }

  .gpu-usage {
    position: relative;
    display: flex;
    justify-content: center;
  }

  .gpu-temperature {
    font-size: 0.3em;
    fill: currentColor;
  }

  @container gauge (min-width: 200px) {
    .gpu-temperature {
      font-size: 0.3em;
    }
  }

  .available-memory {
    display: flex;
    justify-content: center;
    font-size: 0.8rem;
  }

  .available-memory > span:last-child::before {
    content: '/';
  }

  .memory.critical {
    animation: pulse 0.5s infinite ease-in-out;
  }

  @container host (min-width: 330px) {
    .available-memory {
      font-size: 1rem;
    }
  }
`;
