import { Router } from '@vaadin/router';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { linkStyles } from './line.styles.js';

@customElement('om-link')
export class OmLink extends LitElement {
  static styles = linkStyles;

  @property()
  accessor to = '';

  constructor() {
    super();

    this.addEventListener('click', this);
    this.addEventListener('touchstart', this);
    window.addEventListener('vaadin-router-go', this);

    this.onLocationChange();
  }

  override disconnectedCallback() {
    this.removeEventListener('click', this);
    this.removeEventListener('touchstart', this);
    window.removeEventListener('vaadin-router-go', this);
  }

  handleEvent(event: Event) {
    switch (event.type) {
      case 'click':
      case 'touchstart':
        Router.go(this.to);

        event.preventDefault();
        break;
      case 'vaadin-router-go':
        this.onLocationChange();
        break;
    }
  }

  private onLocationChange() {
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

declare global {
  interface HTMLElementTagNameMap {
    'om-link': OmLink;
  }
}
