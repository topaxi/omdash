import { Router } from "@vaadin/router";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement('om-link')
export class OmLink extends LitElement {
  @property()
  to = '';

  constructor() {
    super();

    this.addEventListener('click', (_event) => {
      Router.go(this.to);
    });

    this.onLocationChange();

    window.addEventListener('vaadin-router-go', this.onLocationChange);
  }

  override disconnectedCallback() {
    window.removeEventListener('vaadin-router-go', this.onLocationChange);
  }

  onLocationChange = () => {
    setTimeout(() => {
      if (window.location.pathname === this.to) {
        this.setAttribute('aria-selected', 'true');
      } else {
        this.removeAttribute('aria-selected');
      }
    }, 10);
  }

  protected render(): unknown {
    return html`<slot></slot>`;
  }
}
