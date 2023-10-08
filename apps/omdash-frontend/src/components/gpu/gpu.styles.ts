import { css } from 'lit';

export const gpuStyles = css`
  om-gauge {
    width: 134px;
  }

  .memory {
    /* Assumption that a system will rarely if ever reduce swap back to 0%,
      * we only care about fading in.
      */
    animation: fade-in 0.5s ease-in-out;
    width: 110px;
    position: absolute;
    bottom: 1px;
    z-index: -1;

    --dial-stroke-width: 0;
    --stroke-width: 2;
    --text-transform: translateY(-1rem);
  }

  .gpu-usage {
    position: relative;
    display: flex;
    justify-content: center;
  }

  .gpu-temperature {
    position: absolute;
    left: 0;
    font-size: 0.8rem;
  }

  .available-memory {
    display: flex;
    justify-content: center;
    font-size: 0.8rem;
  }

  .available-memory > span:last-child::before {
    content: '/';
  }

  @keyframes fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
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

  .critical {
    animation: pulse 0.5s infinite ease-in-out;
  }

  @container host (min-width: 330px) {
    om-gauge {
      width: 160px;
    }

    .memory {
      width: 132px;
      bottom: 2px;
      --stroke-width: 2;
    }

    .available-memory {
      font-size: 1rem;
    }
  }

  @container host (min-width: 420px) {
    om-gauge {
      width: 220px;
    }

    .memory {
      width: 180px;
      bottom: 2px;
      --stroke-width: 3;
    }
  }
`;
