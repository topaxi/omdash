import { css } from 'lit';

export const hostsStyles = css`
  :host {
    display: flex;
    gap: var(--tile-gap);
    flex-grow: 1;
  }

  .host-list {
    display: flex;
    flex-direction: column;
    gap: var(--tile-gap);
  }

  .selected-hosts {
    display: flex;
    gap: var(--tile-gap);
    flex-grow: 1;
  }

  .selected-hosts > * {
    flex: 1 1 0px;
  }

  om-host::part(cpu),
  om-host::part(memory),
  om-host::part(gpu) {
    max-width: 250px;
  }

  om-box[data-hostname='ompi']:not(:only-child) {
    max-width: 400px;
  }
`;
