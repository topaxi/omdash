import { CSSResultArray, CSSResultGroup, LitElement, css } from 'lit';

const globalStyles = css`
  @layer reset {
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    * {
      margin: 0;
      min-width: 0;
    }

    img,
    picture,
    video,
    canvas,
    svg {
      display: block;
      max-width: 100%;
    }

    input,
    button,
    textarea,
    select {
      font: inherit;
    }

    p,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      overflow-wrap: break-word;
    }
  }
`;

export class OmdashComponent extends LitElement {
  private static _styles: CSSResultArray = [];

  static get styles() {
    return [globalStyles, ...this._styles];
  }

  static set styles(styles: CSSResultGroup) {
    this._styles = Array.isArray(styles) ? styles : [styles];
  }
}
