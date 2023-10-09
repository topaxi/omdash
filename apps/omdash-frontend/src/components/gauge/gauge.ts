import { LitElement, PropertyValueMap, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { Gauge } from 'omdash-gauge';
import { bind } from '../../decorators/bind.js';
import { gaugeStyles } from './gauge.styles.js';

@customElement('om-gauge')
export class OmGauge extends LitElement {
  static styles = gaugeStyles;

  @property({ type: Number })
  percent = 0;

  @property()
  label = '';

  @query('.gauge-container')
  gaugeElement!: HTMLDivElement;

  private viewBox = '0 0 100 55';

  private gauge!: Gauge;

  @bind()
  private renderLabel(value: number): string {
    return `${this.label} ${Math.round(value)}%`.trim();
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    this.gauge = new Gauge(this.gaugeElement, {
      max: 100,
      min: 0,
      dialStartAngle: 180,
      dialEndAngle: 0,
      viewBox: this.viewBox,
      label: this.label ? this.renderLabel : () => '',
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
    return html`
      <slot name="before"></slot>
      <div part="gauge-container" class="gauge-container"></div>
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-gauge': OmGauge;
  }
}
