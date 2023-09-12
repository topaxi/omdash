import { Router } from '@vaadin/router';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('om-link')
export class OmLink extends LitElement {
  static styles = css`
    :host {
      cursor: pointer;
    }
  `;

  @property()
  to = '';

  constructor() {
    super();

    this.addEventListener('click', this);
    this.addEventListener('touchstart', this);

    this.onLocationChange();

    window.addEventListener('vaadin-router-go', this.onLocationChange);
  }

  override disconnectedCallback() {
    window.removeEventListener('vaadin-router-go', this.onLocationChange);
  }

  handleEvent(event: Event) {
    if (event.type === 'click' || event.type === 'touchstart') {
      Router.go(this.to);

      event.preventDefault();
    }
  }

  onLocationChange = () => {
    setTimeout(() => {
      if (window.location.pathname === this.to) {
        this.setAttribute('aria-selected', 'true');
      } else {
        this.removeAttribute('aria-selected');
      }
    }, 10);
  };

  protected render(): unknown {
    return html`<slot></slot>`;
  }
}
