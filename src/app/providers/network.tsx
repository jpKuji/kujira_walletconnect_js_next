'use client'
/**
 * Functions for connecting & maintaining the connection to the KUJIRA blockchain
 * 
 * - uses Tendermint RPC client
 * - manages network-related state and logic (current network, preferred RPC endpoint, etc.)
 * - handles connection logic including choosing the best RPC endpoint
 * - enables using "query" const in the whole application to access the blockchain
 */

import {
	HttpBatchClient,
	Tendermint37Client,
} from "@cosmjs/tendermint-rpc";
import { ChainInfo } from "@keplr-wallet/types";
import {
	CHAIN_INFO,
	KujiraQueryClient,
	MAINNET,
	NETWORK,
	RPCS,
	TESTNET,
	kujiraQueryClient,
} from "kujira.js";
import {
	Dispatch,
	FC,
	PropsWithChildren,
	SetStateAction,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

// state of a RPC blockchain connection
interface RPCConnection {
  endpoint: string;
  latency: number;
  latestBlockTime: Date;
  connectedTime: Date;
}

// shape of the network context
export type NetworkContext = {
  network: NETWORK;
  setNetwork: (n: NETWORK) => void;

  tmClient: Tendermint37Client | null;
  query: KujiraQueryClient | null;
  rpc: string;
  rpcs: RPCConnection[];
  setRpc: (val: string) => void;
  preferred: string | null;
  
  unlock: () => void;
  lock: () => void;
};

const Context = createContext<NetworkContext>({
	network: MAINNET,
	setNetwork: () => {},
	tmClient: null,
	query: null,
	rpc: "",
	rpcs: [],
	setRpc: () => {},
	preferred: null,
	unlock: () => {},
	lock: () => {},
});

// creates a Tendermint client for a given endpoint and measures the connection latency
const toClient = async (
	endpoint: string,
	setLatencies?: Dispatch<
    SetStateAction<Record<string, RPCConnection>>
  >
): Promise<[Tendermint37Client, string]> => {
	const start = new Date().getTime();

	const c = await Tendermint37Client.create(
		new HttpBatchClient(endpoint, {
			dispatchInterval: 100,
			batchSizeLimit: 200,
		})
	);
	const status = await c.status();

	setLatencies &&
    setLatencies((prev) => ({
    	...prev,
    	[endpoint]: {
    		endpoint,
    		latency: new Date().getTime() - start,
    		connectedTime: new Date(),
    		latestBlockTime: new Date(
    			status.syncInfo.latestBlockTime.toISOString()
    		),
    	},
    }));
	return [c, endpoint];
};

// manages network-related state and logic (current network, preferred RPC endpoint, etc.)
// handles connection logic including choosing the best RPC endpoint.
export const NetworkContext: React.FC<
  PropsWithChildren<{
    onError?: (err: any) => void;
  }>
> = ({ children, onError }) => {
	

	// TODO: CHANGE TESTNET TO MAINNET FOR MVP LAUNCH
	const [network, setNetwork] = useLocalStorage("network", TESTNET);
	const [preferred, setPreferred] = useLocalStorage("rpc", "");
	const [tm, setTmClient] = useState<
    null | [Tendermint37Client, string]
  >();
	const [latencies, setLatencies] = useState<
    Record<string, RPCConnection>
  >({});
	// const [query, setQuery] = useState<KujiraQueryClient | null>(null);

	const tmClient = tm && tm[0];

	// on mount and network change, it either connects to a preferred RPC or selects the best available one from a list
	// also updates the Tendermint client and connection details (latency, etc.)
	useEffect(() => {
		if (preferred) {
			toClient(preferred)
				.then(setTmClient)
				.catch((err) =>
					onError ? onError(err) : console.error(err)
				);
		} else {
			Promise.any(
				RPCS[network as NETWORK].map((x) => toClient(x, setLatencies))
			)
				.then(setTmClient)
				.catch((err) => {
					setTmClient(null);
					onError ? onError(err) : console.error(err);
				});
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [network]);

	// allows for setting a specfic RPC endpoint manually
	const setRpc = (val: string) => {
		toClient(val)
			.then((client) => {
				setTmClient(client);
			})
			.catch((err) => (onError ? onError(err) : console.error(err)));
	};

	// unlocks the preferred RPC endpoint
	const unlock = () => {
		setPreferred("");
	};

	// locks the preferred RPC endpoint --> ("pin" in UI)
	const lock = () => {
		tm && setPreferred(tm[1]);
	};

	// enables using "query" const in the whole application to access the blockchain. It is a wrapper around the Tendermint client
	const query = useMemo(() => {
		return tmClient ? kujiraQueryClient({ client: tmClient }) : null;
	}, [tmClient]);
	
	// based on the current state of the connection, renders either the children or a "no connection" UI
	switch (tm) {
	case null:
		return (
			<NoConnection network={network} setNetwork={setNetwork} />
		);
	case undefined:
		return null;
	default:
		return (
			<Context.Provider
				key={network}
				value={{
					network,
					setNetwork,
					tmClient: tmClient || null,
					query,
					rpc: tm[1],
					rpcs: Object.values(latencies),
					setRpc,
					unlock,
					lock,
					preferred: preferred || null,
				}}>
				{children}
			</Context.Provider>
		);
	}
};

// UI component for when there is no connection to the blockchain
const NoConnection: FC<{
  network: NETWORK;
  setNetwork(n: NETWORK): void;
}> = ({ network, setNetwork }) => {
	return (
		<div className="px-2 py-10 md-flex ai-c jc-c dir-c wrap">
			<h1 className="fs-18">
        No RPC connections available for {network}
			</h1>
			<h2 className="fs-16">Please check your internet connection</h2>
			{network !== MAINNET && (
				<button
					className="md-button mt-2"
					onClick={() => setNetwork(MAINNET)}>
          Switch to Mainnet
				</button>
			)}
		</div>
	);
};

export const useNetwork = (): [
  {
    network: NETWORK;
    chainInfo: ChainInfo;
    tmClient: Tendermint37Client | null;
    query: KujiraQueryClient | null;
    rpc: string;
    rpcs: RPCConnection[];
    setRpc: (val: string) => void;
    preferred: null | string;
    unlock: () => void;
    lock: () => void;
  },
  (n: NETWORK) => void
] => {
	const {
		network,
		setNetwork,
		tmClient,
		query,
		rpc,
		setRpc,
		preferred,
		lock,
		unlock,
		rpcs,
	} = useContext(Context);

	return [
		{
			network,
			chainInfo: CHAIN_INFO[network],
			tmClient,
			query,
			rpc,
			rpcs,
			setRpc,
			preferred,
			lock,
			unlock,
		},
		setNetwork,
	];
};
