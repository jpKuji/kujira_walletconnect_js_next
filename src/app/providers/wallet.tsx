'use client'
/** 
 * Functionality of this file:
 * 
 * - Wallet Management: Connection / Disconnection of different wallets
 * - State Management: Keeps track of the wallet's state including account details, balances and delegations.
 * - User Interaction: Provides UI elements for the user to interact with the wallet (through modals)
 * - Transaction Handling: Offers functions for signing and broadcasting transactions
 * - Adaptability: Allows for different wallet types to be used in the application
*/


import {
	AccountData,
	EncodeObject,
} from "@cosmjs/proto-signing";
import {
	Coin,
	DeliverTxResponse,
	assertIsDeliverTxSuccess,
} from "@cosmjs/stargate";
import { ChainInfo } from "@keplr-wallet/types";
import { Any } from "cosmjs-types/google/protobuf/any";
import { BigNumber } from "ethers";
import { CHAIN_INFO, Denom, MAINNET, NETWORK } from "kujira.js";
import {
	FC,
	PropsWithChildren,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";
import { toast } from "react-hot-toast";
import { PageRequest } from "cosmjs-types/cosmos/base/query/v1beta1/pagination";
import { QR } from "react-qr-rounded";
import Input from "./wallets/(components)/Input";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { IconAngleRight, IconSonar } from "../icons";
import {
	Keplr,
	ReadOnly,
	Sonar,
} from "./wallets";
import { useNetwork } from "./network";
import Image from "next/image";
import Link from "next/link";
import { ModalTemplate } from "../(components)/ModalTemplate";

// defines different wallet types -> easier reference in the application
export enum Adapter {
  Sonar = "sonar",
  Keplr = "keplr",
  ReadOnly = "readOnly",
}

// Defines the shape of the wallet object, including functions and state related to the wallet.
export type IWallet = {
	// account details and chain information
	account: AccountData | null;
	kujiraAccount: Any | null;
	chainInfo: ChainInfo;
	adapter: null | Adapter;

	// connection and disconnection functions
	connect: null | ((adapter: Adapter, chain?: NETWORK) => void);
	disconnect: () => void;
	
	// balance management functions & state
	balances: Coin[];
	balance: (denom: Denom) => BigNumber;
	getBalance: (
		denom: Denom,
		refresh?: boolean
		) => Promise<BigNumber | null>;
	refreshBalances: () => void;
    
	// transaction handling
	signAndBroadcast: (
		msgs: EncodeObject[],
		memo?: string
		) => Promise<DeliverTxResponse>;
    
	// fee denomination management
	feeDenom: string;
	setFeeDenom: (denom: string) => void;
};

// initializes the context with default values for the IWallet type
const Context = createContext<IWallet>({
	account: null,
	kujiraAccount: null,
	
	chainInfo: {} as ChainInfo,
	adapter: null,
	
	connect: null,
	disconnect: () => {},
	
	// no balances by default
	getBalance: async () => BigNumber.from(0),
	balance: () => BigNumber.from(0),
	balances: [],
	refreshBalances: () => {},
	
	// no signing by default
	signAndBroadcast: async () => {
		throw new Error("Not Implemented");
	},
	
	// fees are paid in ukuji as standard
	feeDenom: "ukuji",
	setFeeDenom: () => {},
});

// utility function to convert a wallet object to an adapter
const toAdapter = (wallet: any) => {
	return wallet instanceof Keplr
		? Adapter.Keplr
		  : wallet instanceof Sonar
			  ? Adapter.Sonar
			: wallet instanceof ReadOnly
				? Adapter.ReadOnly
				: null;
};

// defines the wallet context, which is used to provide wallet information to the application
// manages various wallet states, including balances, delegations, and connection status
export const WalletContext: FC<PropsWithChildren<{}>> = ({
	children,
}) => {
	const [wallet, setWallet] = useState<
    | Sonar
    | Keplr
    | ReadOnly
    | null
  >(null);
	const [stored, setStored] = useLocalStorage("wallet", "");
	const [address, setAddress] = useLocalStorage("address", "");
	const [showAddress, setShowAddress] = useState(false);

	const [{ network, chainInfo, query, rpc }] = useNetwork();

	const adapter = toAdapter(wallet);

	// sets the fee denom to ukuji by default
	const [feeDenom, setFeeDenom] = useLocalStorage(
		"feeDenom",
		"ukuji"
	);

	const [balances, setBalances] = useState<Record<string, BigNumber>>(
		{}
	);
	const [kujiraBalances, setKujiraBalances] = useState<Coin[]>([]);


	const [link, setLink] = useState("");
	const [modal, setModal] = useState(false);

	const [kujiraAccount, setKujiraAccount] = useState<null | Any>(
		null
	);

	// if the user was already connected using readOnly, connect them automatically to the same address again and store the connection in localStorage
	useEffect(() => {
		if (!wallet && stored === Adapter.ReadOnly && address) {
			ReadOnly.connect(address).then(setWallet);
			return;
		}

		stored && connect(stored, network, true);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// if the network changes, reconnect the wallet
	useEffect(() => {
		wallet && connect(stored, network);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [network]);

	// reset balances when the wallet changes or the tmClient changes
	useEffect(() => {
		setAddress(wallet?.account.address || "");
		setKujiraBalances([]);
		setBalances({});
	}, 
	// do not update the dependency array here
	[wallet, query]);

	// get kujira address
	useEffect(() => {
		if (!wallet) return;
		query?.auth
			.account(wallet.account.address)
			.then((account) => account && setKujiraAccount(account));
	}, [wallet, query]);	

	useEffect(() => {
		wallet && wallet.onChange(setWallet);
	}, [wallet]);

	// manage connection process of different wallet types
	const connect = (
		adapter: Adapter,
		chain?: NETWORK,
		auto?: boolean
	) => {
		const chainInfo: ChainInfo = {
			...CHAIN_INFO[MAINNET],
			chainId: network,
			chainName: "Kujira",
		};

		switch (adapter) {
		
		case Adapter.Keplr:
			Keplr.connect({ ...chainInfo, rpc }, { feeDenom })
				.then((x) => {
					setStored(adapter);
					setWallet(x);
				})
				.catch((err) => {
					setStored("");
					toast.error(err.message);
				});
			break;

		case Adapter.Sonar:
			Sonar.connect(network, {
				request: sonarRequest,
				auto: !!auto,
			}).then((x) => {
				setModal(false);
				setStored(adapter);
				setWallet(x);
			});
			break;

		case Adapter.ReadOnly:
			// open the modal to input an address. Currently not needed
			// setShowAddress(true);
			ReadOnly.connect("kujira1y3ztnmghrmsa8d8h5ny7h2lvq4w3lre9hvwhcw").then((w) => {
				setStored(Adapter.ReadOnly);
				setWallet(w);
			})
			break;
		}
	};

	const disconnect = () => {
		setStored("");
		setWallet(null);
		wallet?.disconnect();
	};

	// get balance of a specific denom
	const balance = (denom: Denom): BigNumber =>
		balances[denom.reference] || BigNumber.from(0);

	// fetches the balance of a specific denom from the blockchain
	const fetchBalance = async (denom: Denom): Promise<BigNumber> => {
		if (!wallet) return BigNumber.from(0);
		if (!query) return BigNumber.from(0);
		return query.bank
			.balance(wallet.account.address, denom.reference)
			.then((resp) => BigNumber.from(resp?.amount || 0))
			.then((balance) => {
				setBalances((prev) => ({
					...prev,
					[denom.reference]: balance,
				}));
				return balance;
			});
	};

	// get current Balance of a specific denom from state or fetch it from the blockchain
	const getBalance = async (denom: Denom, refresh = true) =>
		balances[denom.reference] || refresh
			? fetchBalance(denom)
			: BigNumber.from(0);

	const refreshBalances = () => {
		if (!wallet) return;
		// use of the memoized query wrapper from the network.tsx file
		query?.bank
			.allBalances(
				wallet.account.address,
				PageRequest.fromPartial({ limit: 10000 })
			)
			.then((x) => {
				// save the raw response from the blockchain
				x && setKujiraBalances(x);
				// if denom exists, update the balances object using denom as the key and converting the amount to a BigNumber
				// else return the previous state
				x?.map((b) => {
					setBalances((prev) =>
						b.denom
							? {
								...prev,
								[b.denom]: BigNumber.from(b.amount),
							}
							: prev
					);
				});
			});
	};
	

	// utility function to send a message to the blockchain
	const signAndBroadcast = async ( rpc: string, msgs: EncodeObject[], memo?: string): Promise<DeliverTxResponse> => {
		// Implementation to sign and broadcast transactions...

		if (!wallet) throw new Error("No Wallet Connected");
		const res = await wallet.signAndBroadcast(
			rpc,
			msgs,
			feeDenom,
			memo
		);
		assertIsDeliverTxSuccess(res);
		return res;
	};

	// Creates the SONAR QR Code
	const sonarRequest = (uri: string) => {
		setLink(uri);
		setModal(true);
	};

	return (
		<Context.Provider
			key={network + wallet?.account.address}
			value={{
				adapter,
				account: wallet?.account || null,
				connect,
				disconnect,
				kujiraAccount,
				balances: kujiraBalances,
				getBalance,
				balance,
				signAndBroadcast: (msgs, memo) =>
					signAndBroadcast(rpc, msgs, memo),
				refreshBalances,
				feeDenom,
				setFeeDenom,
				chainInfo,
			}}>

			{children}
			{/* opens the modal for the user to scan the qr code */}
			
			{/* SONAR QR Code Modal. */}
			<ModalTemplate isOpen={modal} onClose={() => setModal(false)}>
				<div className="md:flex">
					<div className="no-shrink bg-primary relative">
						<QR
							height={256}
							color="#d3fffe"
							backgroundColor="transparent"
							rounding={50}
							cutout
							cutoutElement={
								<Image
									alt="sonar logo"
									src={"/sonar.png"}
									objectFit="contain"
									fill
								/>
							}
							errorCorrectionLevel="M">
							{link}
						</QR>
					</div>
					<div className="ml-3 flex flex-col items-start justify-center">
						<IconSonar className="w-40 h-20"/>
						<h3 className="mb-2">Scan this code using the Sonar Mobile App.</h3>
						<Link
							href={"https://sonar.kujira.network"}
							target="_blank"
							className="bg-highlight flex w-fit text-primary text-md rounded-lg px-4 py-2 items-center hover:bg-highlight/70">
              									<p className="">Download Sonar</p>
							<IconAngleRight className="w-6 h-6" />
						</Link>
					</div>
				</div>
				<div className="mt-5 sm:mt-6">
					<button
						type="button"
						className="inline-flex w-full justify-center rounded-md bg-highlight px-3 py-2 text-md font-semibold text-primary shadow-sm hover:bg-highlight/70"
						onClick={() => setModal(false)}
					>
                    Close
					</button>
				</div>
			</ModalTemplate>

			{/* ReadOnly connection Modal to input an address */}
			<ModalTemplate isOpen={showAddress} onClose={() => setShowAddress(false)}>
				<h1>Read Only Connection</h1>
				<p>
            Enter a Kujira address to see a <strong>read only</strong>{" "}
            version of the app, as if connected with this address.
				</p>
				<Input
					placeholder="kujira1..."
					value={address}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.currentTarget.value)}
					onSubmit={() =>
						ReadOnly.connect(address).then((w) => {
							setStored(Adapter.ReadOnly);
							setWallet(w);
							setShowAddress(false);
						})
					}
				/>
			</ModalTemplate>
		</Context.Provider>
	);
};

// Custom hook to use the wallet context
export function useWallet() {
	return useContext(Context);
}
