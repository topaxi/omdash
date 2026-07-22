import { PropertyValueMap, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { Gauge } from 'omdash-gauge';
import { bind } from '../../decorators/bind.js';
import { gaugeStyles } from './gauge.styles.js';
import { OmdashComponent } from '../../base/OmdashComponent.js';

@customElement('om-gauge')
export class OmGauge extends OmdashComponent {
  static styles = gaugeStyles;

  @property({ type: Number })
  accessor percent = 0;

  @property()
  accessor label = '';

  /**
   * When set, the value arc is rendered as stacked colored segments (each
   * `percent` is a share of the gauge's 0-100 range) instead of a single arc.
   * `percent`/`label` still drive the center text. Colors are any CSS color
   * string, e.g. `var(--ctp-macchiato-mauve)`.
   */
  @property({ type: Array })
  accessor segments: Array<{ percent: number; color: string }> | undefined;

  @query('.gauge-container')
  accessor gaugeElement!: HTMLDivElement | null;

  private viewBox = '0 0 100 55';

  private gauge!: Gauge;

  @bind()
  private renderLabel(value: number): string {
    return `${this.label} ${Math.round(value)}%`.trim();
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    this.gauge = new Gauge(this.gaugeElement!, {
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
    const animated = window.navigator.hardwareConcurrency > 4;

    if (this.segments != null) {
      const mapped = this.segments.map((s) => ({
        value: s.percent,
        color: s.color,
      }));

      if (animated) {
        this.gauge.setSegments(mapped, 0.5);
        // Center text still shows the aggregate percent.
        this.gauge.setValueAnimated(this.percent, 0.5);
      } else {
        this.gauge.setSegments(mapped);
        this.gauge.setValue(this.percent);
      }
      return;
    }

    // Restore the single arc if this gauge previously rendered segments.
    this.gauge.clearSegments();

    if (animated) {
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
