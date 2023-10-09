import { css } from 'lit';

export const mountStyles = css`
  :host {
    font-size: 0.8rem;
  }

  .label {
    display: flex;
    justify-content: space-between;
  }

  meter {
    display: block;
    height: 0.75rem;
    width: 100%;
  }
`;
