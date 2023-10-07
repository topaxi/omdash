import { css } from 'lit';

export const processListStyles = css`
  :host {
    display: flex;
    gap: 1rem;
    white-space: nowrap;

    -webkit-mask-image: linear-gradient(
      rgba(0, 0, 0, 1) 0 50%,
      rgba(0, 0, 0, 0.25)
    );
    mask-image: linear-gradient(rgba(0, 0, 0, 1) 0 50%, rgba(0, 0, 0, 0.25));
  }

  .process-list {
    flex: 0 0 50%;
    max-width: 50%;
  }

  .process {
    display: flex;
    gap: 1ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .very-high {
    color: var(--ctp-macchiato-red);
  }

  .high {
    color: var(--ctp-macchiato-maroon);
  }

  .medium {
    color: var(--ctp-macchiato-peach);
  }

  .low {
    color: var(--ctp-macchiato-yellow);
  }

  .very-low {
    color: var(--ctp-macchiato-green);
  }
`;
