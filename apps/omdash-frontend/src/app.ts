import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { connect } from './store/connect.js';

import './components/global.js';
import './routes/hosts.js';

@customElement('om-app')
export class OmApp extends connect()(LitElement) {
  static styles = css`
    :host {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;

      position: relative;
      isolation: isolate;
      contain: strict;
    }

    :host::before {
      content: '';
      position: absolute;

      width: calc(100% + 8px);
      height: calc(100% + 8px);

      left: -4px;
      top: -4px;

      background-image: url(https://source.unsplash.com/random/1280×400/?pcb);
      background-size: cover;

      filter: grayscale(0.5) brightness(0.25);

      z-index: -1;
    }
  `;

  private ws: WebSocket | null = null;

  connectedCallback() {
    // Probably want to handle this in a more robust way.
    // Currently the WebSocket to server connection is always on the same host,
    // therefore we don't need to worry too much about connection issues.
    // Worst case, we can just reload the page.
    this.ws = new WebSocket(`ws://${window.location.hostname}:3300`);

    this.ws.addEventListener('message', (event) => {
      const action = JSON.parse(event.data);

      this.store.dispatch(action);
    });

    super.connectedCallback();
  }

  render() {
    return html`
      <om-global></om-global>
      <om-hosts></om-hosts>
    `;
  }
}
