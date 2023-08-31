import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('om-gauge')
export class OmGauge extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      border-radius: 50%/100% 100% 0 0;
      background-color: var(--color, var(--ctp-macchiato-red));
      overflow: hidden;
    }

    :host::before {
      content: '';
      display: block;
      padding-top: 50%; /* ratio of 2:1*/
    }
    .chart {
      overflow: hidden;
    }
    .mask {
      position: absolute;
      left: 20%;
      right: 20%;
      bottom: 0;
      top: 40%;
      background-color: var(--ctp-macchiato-base);
      border-radius: 50%/100% 100% 0 0;
    }

    .percentage {
      position: absolute;
      top: -1px;
      left: -1px;
      bottom: 0;
      right: -1px;
      background-color: var(--background, var(--ctp-macchiato-crust));
      transform: rotate(var(--rotation));
      transform-origin: bottom center;
      transition: transform 600ms ease;
    }
    .value {
      position: absolute;
      bottom: 0%;
      left: 0;
      width: 100%;
      text-align: center;
    }

    .min {
      position: absolute;
      bottom: 0;
      left: 5%;
    }
    .max {
      position: absolute;
      bottom: 0;
      right: 5%;
    }
  `;

  @property()
  percent = 0;

  get rotation() {
    return Math.round((Number(this.percent) * 180) / 100);
  }

  render() {
    return html`
      <div class="percentage" style="--rotation: ${this.rotation}deg"></div>
      <div class="mask"></div>
      <span class="value"><slot></slot></span>
    `;
  }
}
