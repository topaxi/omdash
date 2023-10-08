import { css } from 'lit';

export const gaugeStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    container: gauge / inline-size;
  }

  text {
    font-family: 'VictorMono Nerd Font', monospace;
  }

  .label {
    position: absolute;
    right: 0;
    top: 0;
    display: inline-block;
    background: rgba(0, 0, 0, 0.5);
    font-size: 0.8em;
    padding: 5px 10px;
  }

  .gauge .dial {
    stroke: rgba(var(--ctp-macchiato-crust-raw), 0.5);
    stroke-width: var(--dial-stroke-width, 10);
    fill: rgba(0, 0, 0, 0);
  }

  .gauge .value {
    stroke: var(--color);
    stroke-width: var(--stroke-width, 13);
    stroke-dasharray: 30.65 1;
    fill: rgba(0, 0, 0, 0);
  }

  .gauge .value-text {
    fill: var(--color, var(--color));
    font-weight: bold;
    font-size: 0.6em;
    transform: var(--text-transform);
  }
`;
