import { customElement, property } from 'lit/decorators.js';
import { OmdashComponent } from '../../base/OmdashComponent';

@customElement('om-os-icon')
export class OmOsIcon extends OmdashComponent {
  @property()
  accessor hostname = '';

  @property()
  accessor platform = '';

  @property()
  accessor release = '';

  protected override render(): unknown {
    // aarch64 arch linux for raspberry pi does not include "rpi" in the release
    if (this.hostname.endsWith('pi')) {
      return ' ';
    }

    switch (this.platform) {
      case 'linux':
        if (this.release.includes('rpi')) {
          return ' ';
        }

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
