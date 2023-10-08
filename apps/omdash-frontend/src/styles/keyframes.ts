import { css } from 'lit';

export const keyframes = css`
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
`;
