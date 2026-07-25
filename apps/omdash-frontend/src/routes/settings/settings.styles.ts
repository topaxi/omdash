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

  .settings {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0.5rem 1ch;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1ch;
  }

  button {
    font: inherit;
    font-size: 4ch;
    padding: 0 1.25ch 0 1ch;
    color: var(--ctp-macchiato-text);
    background-color: var(--ctp-macchiato-surface0);
    border: 1px solid var(--ctp-macchiato-surface2);
    border-radius: 2px;
    cursor: pointer;
  }

  button:hover {
    background-color: var(--ctp-macchiato-surface1);
  }

  button:active {
    background-color: var(--ctp-macchiato-surface2);
  }

  h2 {
    font-size: 1rem;
    font-weight: normal;
    margin: 0 0 0.5rem;
    color: var(--ctp-macchiato-subtext0);
  }

  /* Two columns rather than the default stacked dt/dd with its 40px indent,
     so labels and values line up as a table without being one. */
  .info {
    display: grid;
    grid-template-columns: max-content max-content;
    align-items: baseline;
    gap: 0.35rem 2ch;
    margin: 0;
  }

  .info dt {
    color: var(--ctp-macchiato-subtext0);
  }

  .info dd {
    margin: 0;
  }

  .commit {
    color: var(--ctp-macchiato-mauve);
  }

  .age,
  .unknown {
    color: var(--ctp-macchiato-overlay1);
  }
`;
