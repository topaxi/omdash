import { ReactiveController, ReactiveControllerHost } from 'lit';

export class ClockController implements ReactiveController {
  host: ReactiveControllerHost;

  value = Date.now();

  private readonly timeout: number;
  private _timerID?: ReturnType<typeof setInterval>;

  constructor(host: ReactiveControllerHost, timeout = 1000) {
    (this.host = host).addController(this);
    this.timeout = timeout;
  }

  updateTime() {
    this.value = Date.now();
    this.host.requestUpdate();
  }

  hostConnected() {
    this._timerID = setInterval(this.updateTime.bind(this), this.timeout);
  }

  hostDisconnected() {
    clearInterval(this._timerID);
    this._timerID = undefined;
  }
}
