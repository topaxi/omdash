import { css } from 'lit';

export const hostsStyles = css`
  :host {
    display: flex;
    gap: var(--tile-gap);
    flex-grow: 1;
  }

  om-host[hostname='ompi'] {
    max-width: 400px;
  }
`;
