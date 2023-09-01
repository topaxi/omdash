import { ReactiveController, ReactiveControllerHost } from 'lit';

export class ClockController implements ReactiveController {
  host: ReactiveControllerHost;

  value = Date.now();
  timeout: number;
  private _timerID?: ReturnType<typeof setInterval>;

  constructor(host: ReactiveControllerHost, timeout = 1000) {
    (this.host = host).addController(this);
    this.timeout = timeout;
  }

  hostConnected() {
    this._timerID = setInterval(() => {
      this.value = Date.now();
      this.host.requestUpdate();
    }, this.timeout);
  }

  hostDisconnected() {
    clearInterval(this._timerID);
    this._timerID = undefined;
  }
}
