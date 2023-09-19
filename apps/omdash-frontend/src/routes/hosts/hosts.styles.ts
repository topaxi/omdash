import { css } from 'lit';

export const hostsStyles = css`
  :host {
    display: flex;
    gap: var(--tile-gap);
    flex-grow: 1;
    flex-wrap: wrap;
  }

  :host(.more-than-4) {
    display: grid;
    grid-template-rows: 1fr 1fr;
    grid-auto-flow: column;
  }

  om-host {
    flex: 1 1 30ch;
  }
`;
