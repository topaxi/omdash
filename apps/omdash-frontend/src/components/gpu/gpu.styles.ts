import { css } from 'lit';

export const gpuStyles = css`
  :host {
    min-width: 180px; /* Aligned with cpu styles */
  }

  .memory {
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
    fill: currentColor;
  }

  .gpu-usage {
    position: relative;
    display: flex;
    justify-content: center;
  }

  .gpu-name {
    font-size: 0.3em;
  }

  .gpu-temperature {
    font-size: 0.5em;
  }

  @container gauge (min-width: 200px) {
    .gpu-temperature {
      font-size: 0.4em;
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

  @container host (min-width: 330px) {
    .available-memory {
      font-size: 1rem;
    }
  }
`;
