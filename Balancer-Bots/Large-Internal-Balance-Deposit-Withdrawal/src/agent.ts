import { Finding, HandleBlock, BlockEvent, getEthersProvider } from "forta-agent";
import { providers, BigNumber, utils } from "ethers";
import BalanceFetcher from "./balance.fetcher";
import { NetworkManager } from "forta-agent-tools";
import { createFinding, NetworkData } from "./utils";
import { EVENT } from "./constants";
import CONFIG from "./agent.config";

const networkManager = new NetworkManager<NetworkData>(CONFIG);

export const initialize = (networkManager: NetworkManager<NetworkData>, provider: providers.Provider) => {
  return async () => {
    await networkManager.init(provider);
  };
};

export const provideHandleBlock = (
  provider: providers.Provider,
  networkManager: NetworkManager<NetworkData>,
  balanceFetcher: BalanceFetcher
): HandleBlock => {
  const vaultIface = new utils.Interface(EVENT);

  const sighash = [vaultIface.getEventTopic("InternalBalanceChanged")];

  return async (blockEvent: BlockEvent): Promise<Finding[]> => {
    const findings: Finding[] = [];

    const logs = (
      await provider.getLogs({
        address: networkManager.get("vaultAddress"),
        fromBlock: blockEvent.blockNumber,
        toBlock: blockEvent.blockNumber,
      })
    ).filter((log) => sighash.includes(log.topics[0]));

    await Promise.all(
      logs.map(async (log) => {
        const decodedLog = vaultIface.parseLog(log);

        const delta: BigNumber = BigNumber.from(decodedLog.args.delta);
        balanceFetcher.setData(decodedLog.args.token);

        // fetch token balance of the contract then set threshold.
        const totalBalance: BigNumber = await balanceFetcher.getBalance(
          blockEvent.blockNumber - 1,
          networkManager.get("vaultAddress")
        );

        const _threshold = BigNumber.from(totalBalance).mul(networkManager.get("threshold")).div(100);

        if (delta.abs().gte(_threshold)) {
          findings.push(createFinding(decodedLog.args));
        }
      })
    );

    return findings;
  };
};

export default {
  initialize: initialize(networkManager, getEthersProvider()),
  handleBlock: provideHandleBlock(getEthersProvider(), networkManager, new BalanceFetcher(getEthersProvider())),
};
