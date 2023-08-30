import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import "./components/host.js";
import { connect } from "./store/connect.js";

const identity = <T>(value: T) => value;

@customElement("om-app")
export class OmApp extends connect()(LitElement) {
  ws: WebSocket | null = null;

  @state()
  private hostNames: readonly string[] = [];

  connectedCallback() {
    // Probably want to handle this in a more robust way.
    // Currently the WebSocket to server connection is always on the same host,
    // therefore we don't need to worry too much about connection issues.
    // Worst case, we can just reload the page.
    this.ws = new WebSocket(`ws://${window.location.hostname}:3300`);

    this.ws.addEventListener("message", (event) => {
      const action = JSON.parse(event.data);
      const { type, client, payload } = action;

      if (type === "register" && !this.hostNames.includes(payload.name)) {
        this.hostNames = [...this.hostNames, payload.name];
      }

      // Somehow missed the register event, but got a metric event.
      if (client && !this.hostNames.includes(client)) {
        this.hostNames = [...this.hostNames, client];
      }

      this.store.dispatch(action);
    });

    super.connectedCallback();
  }

  render() {
    return repeat(
      this.hostNames,
      identity,
      (hostName) => html` <om-host name=${hostName}></om-host> `,
    );
  }
}