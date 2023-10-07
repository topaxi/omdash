import { LitElement, PropertyValueMap, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Gauge } from 'omdash-gauge';

@customElement('om-gauge')
export class OmGauge extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
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

  @property()
  percent = 0;

  @property()
  label = '';

  private gauge!: Gauge;

  private renderLabel(value: number): string {
    return `${this.label} ${Math.round(value)}%`.trim();
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    this.gauge = new Gauge(this.shadowRoot!, {
      max: 100,
      min: 0,
      dialStartAngle: 180,
      dialEndAngle: 0,
      viewBox: '0 0 100 55',
      label: this.label ? this.renderLabel.bind(this) : () => '',
    });
  }

  protected updated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (window.navigator.hardwareConcurrency > 4) {
      this.gauge.setValueAnimated(this.percent, 0.5);
    } else {
      this.gauge.setValue(this.percent);
    }
  }

  protected render(): unknown {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-gauge': OmGauge;
  }
}
