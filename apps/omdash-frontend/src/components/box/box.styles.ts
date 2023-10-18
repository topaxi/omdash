import { css } from 'lit';

export const boxStyles = css`
  @property --rotate {
    syntax: '<angle>';
    initial-value: 132deg;
    inherits: false;
  }

  :host {
    position: relative;
    display: flex;
    --box-border-radius: 1px;
    border-radius: var(--box-border-radius);
    background-color: rgb(var(--ctp-macchiato-crust-raw), 70%);
    -webkit-backdrop-filter: blur(8px) grayscale(1);
    backdrop-filter: blur(8px) grayscale(1);
  }

  :host::part(border) {
    flex: 1;
    overflow: hidden;
    padding: 0.2rem 0.33rem;
    border: var(--box-border-radius) solid transparent;
    border-image: linear-gradient(
        var(--rotate, 132deg),
        #7dc4e4,
        #c6a0f6 43%,
        #ed8796
      )
      1;
    animation: spin 3.1415s linear infinite;
  }

  @keyframes spin {
    0% {
      --rotate: 0deg;
    }
    100% {
      --rotate: 360deg;
    }
  }
`;
