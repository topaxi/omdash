import { css } from 'lit';
import { keyframes } from '../../styles/keyframes';

export const hostStyles = css`
  ${keyframes}

  :host {
    flex: 1 1 0;
    overflow: hidden;
    container: host / inline-size;
  }

  :host(.offline) {
    opacity: 0.8;
    filter: grayscale();
  }

  .gauges {
    display: flex;
    gap: 0.5rem;
  }

  .gauges > * {
    flex: 1 1 0;
  }

  .host-title {
    display: flex;
    flex-wrap: wrap;
    gap: 1ch;
    white-space: nowrap;
    padding-right: 56px;
    line-height: 0.75;
    padding-top: 4px;
    margin-bottom: 0.5rem;
  }

  .battery {
    position: absolute;
    top: 8px;
    right: 1ch;
  }

  .critical {
    animation: pulse 1s infinite;
  }

  .mount-list {
    display: none;
  }

  @container host (min-width: 320px) {
    .process-list, .mount-list {
      flex: 1 1 0;
    }

    .mount-list {
      display: block;
    }
  }
`;
