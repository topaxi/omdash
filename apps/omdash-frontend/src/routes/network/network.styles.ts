import { css } from 'lit';

export const networkStyles = css`
  :host {
    display: flex;
    width: 100%;
    height: 100%;
  }

  .content {
    position: relative;
    flex-grow: 1;
  }

  .legend {
    position: absolute;
    left: 36px;
    font-size: 0.9rem;
  }
`;
