import { css } from 'lit';

export const settingsStyles = css`
  :host {
    display: flex;
    width: 100%;
    height: 100%;
  }

  .content {
    flex-grow: 1;
  }

  button {
    font: inherit;
    font-size: 4ch;
    padding: 0 1.25ch 0 1ch;
  }
`;
