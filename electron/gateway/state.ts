import { PORTS } from '../utils/config';
import { logger } from '../utils/logger';
import type { GatewayStatus } from './manager';

type GatewayStateHooks = {
  emitStatus: (status: GatewayStatus) => void;
  onTransition?: (previousState: GatewayStatus['state'], nextState: GatewayStatus['state']) => void;
};

export class GatewayStateController {
  private status: GatewayStatus = { state: 'stopped', port: PORTS.OPENCLAW_GATEWAY };

  constructor(private readonly hooks: GatewayStateHooks) {}

  getStatus(): GatewayStatus {
    return { ...this.status };
  }

  isConnected(isSocketOpen: boolean): boolean {
    return this.status.state === 'running' && isSocketOpen;
  }

  setStatus(update: Partial<GatewayStatus>): void {
    const previousState = this.status.state;

    // When the gateway stops, reset gatewayReady so renderer blocks RPCs until
    // the next gateway.ready event or fallback timer fires.
    if (update.state === 'stopped') {
      update.gatewayReady = false;
    }

    this.status = { ...this.status, ...update };

    if (this.status.state === 'running' && this.status.connectedAt) {
      this.status.uptime = Date.now() - this.status.connectedAt;
    }

    this.hooks.emitStatus(this.status);

    if (previousState !== this.status.state) {
      logger.debug(`Gateway state changed: ${previousState} -> ${this.status.state}`);
      this.hooks.onTransition?.(previousState, this.status.state);
    }
  }
}
