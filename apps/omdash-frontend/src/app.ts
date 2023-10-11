import { Router } from '@vaadin/router';
import { LitElement, html } from 'lit';
import { customElement, query } from 'lit/decorators.js';

import { connect } from './store/connect.js';

import './components/global/global.js';
import { appStyles } from './app.styles.js';

@customElement('om-app')
export class OmApp extends connect()(LitElement) {
  static styles = appStyles;

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
      {
        path: '/',
        component: 'om-hosts',
        action: () =>
          import('./routes/hosts/hosts').then(
            (m) => m.Hosts as unknown as HTMLElement,
          ),
      },
      {
        path: '/network',
        component: 'om-network',
        action: () =>
          import('./routes/network/network').then(
            (m) => m.OmNetwork as unknown as HTMLElement,
          ),
      },
      {
        path: '/spotify',
        component: 'om-spotify',
      },
      {
        path: '/settings',
        component: 'om-settings',
        action: () =>
          import('./routes/settings/settings').then(
            (m) => m.OmSettings as unknown as HTMLElement,
          ),
      },
    ]);
  }

  render() {
    return html`
      <om-global></om-global>
      <div id="outlet"></div>
    `;
  }
}
