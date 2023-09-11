import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import '../components/box.js';

let token: { access_token: string; token_type: string, expires_in: number } | null = null;
let tokenExpiresAt: number | null = null;

@customElement('om-spotify')
export class OmSpotify extends LitElement {
  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
    }

    .content {
      flex-grow: 1;
    }
  `;

  @state()
  private player: any;

  protected async getSpotifyToken() {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: import.meta.env.VITE_OMDASH_SPOTIFY_CLIENT_ID,
      client_secret: import.meta.env.VITE_OMDASH_SPOTIFY_CLIENT_SECRET,
    });

    token = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body,
    }).then(res => res.ok ? res.json() : Promise.reject(res))
    
    tokenExpiresAt = Date.now() + token!.expires_in * 1000;
  }
  
  private isTokenExpired() {
    return tokenExpiresAt! < Date.now();
  }

  protected async fetchPlayer() {
    if (!token || this.isTokenExpired()) {
      await this.getSpotifyToken();
    }

    return fetch('https://api.spotify.com/me/player', {
      headers: {
        Authorization: `Bearer ${token!.access_token}`,
      }
    });
  }

  async connectedCallback() {
    super.connectedCallback();

    this.player = await this.fetchPlayer();
  }

  protected render(): unknown {
    return html`
      <om-box class="content">
        <pre>${JSON.stringify(this.player, null, 2)}</pre>
      </om-box>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-spotify': OmSpotify;
  }
}

export async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("scope", "user-read-private user-read-email");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

