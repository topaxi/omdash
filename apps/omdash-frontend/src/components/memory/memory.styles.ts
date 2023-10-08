import { css } from 'lit';
import { keyframes } from '../../styles/keyframes';

export const memoryStyles = css`
  ${keyframes}

  om-gauge {
    width: 134px;
  }

  .swap {
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
    om-gauge {
      width: 160px;
    }

    .swap {
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

    .swap {
      width: 180px;
      bottom: 2px;
      --stroke-width: 3;
    }
  }
`;
