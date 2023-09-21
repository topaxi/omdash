import { css } from 'lit';

export const appStyles = css`
  :host {
    --tile-gap: 1rem;
    display: flex;
    gap: var(--tile-gap);
    padding: var(--tile-gap);

    position: relative;
    isolation: isolate;
    contain: strict;
  }

  :host::before {
    content: '';
    position: absolute;

    width: calc(100% + 8px);
    height: calc(100% + 8px);

    left: -4px;
    top: -4px;

    background-image: url(https://source.unsplash.com/random/1280×400/?pcb);
    background-size: cover;

    filter: grayscale(0.75) brightness(0.5);

    z-index: -1;
  }

  #outlet {
    display: contents;
  }
`;
