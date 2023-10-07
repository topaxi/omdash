import { css } from 'lit';

export const boxStyles = css`
  :host {
    display: block;
    border-radius: 6px;
    border: 1px solid var(--ctp-macchiato-lavender);
    background-color: rgb(var(--ctp-macchiato-base-raw), 66.6%);
    -webkit-backdrop-filter: blur(8px) grayscale(1);
    backdrop-filter: blur(8px) grayscale(1);

    padding: 0.2rem 0.33rem;
  }
`;
