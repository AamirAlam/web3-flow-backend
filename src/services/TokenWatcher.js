import { ethers } from "ethers";
import { ERC20_ABI } from "./ERC20ABI.js";
import { eventEmitterStore } from "./EventEmitterStore.js";

export class TokenWatcher {
  constructor(rpcUrl) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.watchers = new Map();
    this.emitter = eventEmitterStore.getEmitter();
  }

  async watchAddress(walletAddress, callback) {
    const abi = [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ];

    const tokenAddress = "0x8BD0e959E9a7273D465ac74d427Ecc8AAaCa55D8";
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      this.provider
    );
    console.log(`Watching for Transfer events for wallet: ${walletAddress}`);

    // Listen for all Transfer events
    this.provider.on(
      {
        address: tokenAddress,
        topics: [
          ethers.id("Transfer(address,address,uint256)"), // The event signature for Transfer
        ],
      },
      (log) => {
        const parsedLog = tokenContract.interface.parseLog(log);
        const { from, to, value } = parsedLog.args;

        // Check if the event involves the specific wallet address
        if (
          from.toLowerCase() === walletAddress.toLowerCase() ||
          to.toLowerCase() === walletAddress.toLowerCase()
        ) {
          console.log(`Transfer detected:
          From: ${from}
          To: ${to}
          Value: ${ethers.formatUnits(value, 18)} tokens
        `);

          // Trigger the callback with event details
          callback({ from, to, value, log });
        }
      }
    );

    return null;
  }

  async decodeTransferEvent(log) {
    try {
      const iface = new ethers.Interface(ERC20_ABI);
      const event = iface.parseLog(log);

      if (event) {
        const tokenContract = new ethers.Contract(
          log.address,
          ERC20_ABI,
          this.provider
        );
        const [symbol, decimals] = await Promise.all([
          tokenContract.symbol().catch(() => "UNKNOWN"),
          tokenContract.decimals().catch(() => 18),
        ]);

        return {
          tokenAddress: log.address,
          tokenSymbol: symbol,
          from: event.args[0],
          to: event.args[1],
          value: event.args[2],
          valueFormatted: ethers.formatUnits(event.args[2], decimals),
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error("Error decoding transfer event:", error);
    }
    return null;
  }

  getWatcherInfo(watcherId) {
    return this.watchers.get(watcherId);
  }

  getAllWatchers() {
    return Array.from(this.watchers.entries()).map(([id, info]) => ({
      id,
      walletAddress: info.walletAddress,
    }));
  }

  stopWatching(watcherId) {
    const watcher = this.watchers.get(watcherId);
    if (watcher) {
      this.provider.off(watcher.filter, watcher.handler);
      this.watchers.delete(watcherId);
      this.emitter.removeAllListeners(`transfer:${watcherId}`);
      return true;
    }
    return false;
  }

  stopAllWatchers() {
    for (const [watcherId] of this.watchers) {
      this.stopWatching(watcherId);
    }
  }
}
