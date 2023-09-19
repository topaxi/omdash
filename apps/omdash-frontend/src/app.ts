import { Router } from '@vaadin/router';
import { LitElement, css, html } from 'lit';
import { customElement, query } from 'lit/decorators.js';

import { connect } from './store/connect.js';

import './components/global.js';
import './routes/hosts.js';
import './routes/network.js';
import './routes/settings.js';

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

    #outlet {
      display: contents;
    }
  `;

  private ws: WebSocket | null = null;

  @query('#outlet')
  // @ts-ignore
  private outlet: HTMLDivElement;

  private router: Router | null = null;
  private manifest: string | undefined;

  connectedCallback() {
    if (process.env.NODE_ENV === 'production') {
      setInterval(this.checkForUpdates.bind(this), 1000 * 60);
    }

    super.connectedCallback();
  }

  protected async checkForUpdates() {
    const manifest = await fetch('/manifest.json')
      .then((res) => (res.ok ? res : Promise.reject(res)))
      .then((res) => res.text());

    if (this.manifest != null && this.manifest !== manifest) {
      window.location.reload();
    }

    this.manifest = manifest;
  }

  protected override firstUpdated() {
    this.router = new Router(this.outlet);
    this.setupRoutes(this.router);
  }

  private setupRoutes(router: Router) {
    router.setRoutes([
      { path: '/', component: 'om-hosts' },
      { path: '/network', component: 'om-network' },
      { path: '/spotify', component: 'om-spotify' },
      { path: '/settings', component: 'om-settings' },
    ]);
  }

  render() {
    return html`
      <om-global></om-global>
      <div id="outlet"></div>
    `;
  }
}
