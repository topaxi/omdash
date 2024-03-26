import { Router } from '@vaadin/router';
import { html } from 'lit';
import { customElement, query } from 'lit/decorators.js';

import { connect } from './store/connect.js';

import './components/global/global.js';
import { appStyles } from './app.styles.js';
import { OmdashComponent } from './base/OmdashComponent.js';

function v(p: Promise<unknown>): Promise<void> {
  return p.then(() => {});
}

@customElement('om-app')
export class OmApp extends connect()(OmdashComponent) {
  static styles = appStyles;

  @query('#outlet')
  private outlet!: HTMLDivElement | null;

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
        action: () => v(import('./routes/hosts/hosts')),
      },
      {
        path: '/network',
        component: 'om-network',
        action: () => v(import('./routes/network/network')),
      },
      {
        path: '/spotify',
        component: 'om-spotify',
      },
      {
        path: '/settings',
        component: 'om-settings',
        action: () => v(import('./routes/settings/settings')),
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
