import { css } from 'lit';

export const lineGraphStyles = css`
  :host {
    display: block;
  }

  .axis path,
  .axis line {
    fill: none;
    stroke: #dddddd;
    shape-rendering: crispEdges;
  }

  .axis text {
    font: 10px sans-serif;
    fill: #dddddd;
  }
`;
