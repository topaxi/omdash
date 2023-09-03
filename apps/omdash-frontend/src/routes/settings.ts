import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement('om-settings')
export class OmSettings extends LitElement {
  static styles = css`
    button {
      font: inherit;
      font-size: 4ch;
      padding: 0 1.25ch 0 1ch;
    }
  `

  private refresh() {
    window.location.href = '/';
  }


  protected render(): unknown {
    return html`<button @click=${this.refresh}>󰑐</button>`;
  }
}
