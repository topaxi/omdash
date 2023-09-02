import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('om-os-icon')
export class OmOsIcon extends LitElement {
  @property()
  platform = '';

  @property()
  release = '';

  protected override render(): unknown {
    switch (this.platform) {
      case 'linux':
        if (this.release.includes('arch')) {
          return ' ';
        }

        return ' ';
      case 'darwin':
        return ' ';
      case 'win32':
        return ' ';
      default:
        return '';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-os-icon': OmOsIcon;
  }
}