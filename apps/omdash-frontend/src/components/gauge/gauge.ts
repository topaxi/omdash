import { LitElement, PropertyValueMap, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Gauge } from 'omdash-gauge';
import { gaugeStyles } from './gauge.styles.js';

@customElement('om-gauge')
export class OmGauge extends LitElement {
  static styles = gaugeStyles;

  @property({ type: Number })
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