import {
	AccountData,
	Algo,
	EncodeObject,
} from "@cosmjs/proto-signing";
import {
	DeliverTxResponse,
	StargateClient,
	assertIsDeliverTxSuccess,
} from "@cosmjs/stargate";
import Client, { SignClient } from "@walletconnect/sign-client";
import { SessionTypes } from "@walletconnect/types";
import { MAINNET, registry } from "kujira.js";

const requiredNamespaces = {
	cosmos: {
		chains: ["cosmos:kaiyo-1"],
		methods: [],
		events: [],
	},
};

// https://docs.walletconnect.com/2.0/javascript/sign/dapp-usage
export class Sonar {
	public account: AccountData;

	private constructor(
    private connector: Client,
    public session: SessionTypes.Struct
	) {
		const [account] = session.namespaces["cosmos"].accounts.map(
			(address) => ({
				address: address.split(":")[2],
				pubkey: new Uint8Array(),
				algo: "secp256k1" as Algo,
			})
		);

		this.account = account;
	}

	static connect = async (
		network: string = MAINNET,
		options: { request: (uri: string) => void; auto: boolean }
	): Promise<Sonar> => {
		const signClient = await SignClient.init({
			projectId: "fbda64846118d1a3487a4bfe3a6b00ac",
		});
		console.log("signClient", signClient)
		const lastSession = signClient
			.find({
				requiredNamespaces,
			})
			.at(-1);

		if (lastSession) return new Sonar(signClient, lastSession);

		const { uri, approval } = await signClient.connect({
			requiredNamespaces,
			// optionalNamespaces: {
			// 	cosmos: {
			// 		chains: [],
			// 		methods: ["cosmos_signDirect", "cosmos_signAmino"],
			// 		events: [],
			// 	},
			// },
		});

		// walletConnect connect function returns a uri. This uri is passed to the sonarRequest function that updates 2 states in the index.tsx to prompt the modal to open.
		uri && options.request(uri);

		const session = await approval();

		return new Sonar(signClient, session);
	};

	public onChange = (fn: (k: Sonar | null) => void) => {
		this.connector.on("session_delete", () => {
			fn(null);
		});
	};

	public disconnect = () => {
		this.connector.disconnect({
			topic: this.session.topic,
			reason: { code: 1, message: "USER_CLOSED" },
		});
	};

	signAndBroadcast = async (
		rpc: string,
		msgs: EncodeObject[],
		feeDenom: string,
		memo?: string
	): Promise<DeliverTxResponse> => {
		const bytes = await this.connector.request<string>({
			topic: this.session.topic,
			chainId: "cosmos:kaiyo-1",
			request: {
				method: this.session.namespaces["cosmos"].methods[0],
				params: {
					feeDenom,
					memo,
					msgs: msgs
						.map((m) => registry.encodeAsAny(m))
						.map((x) => ({
							...x,
							value: Buffer.from(x.value).toString("base64"),
						})),
				},
			},
		});

		const client = await StargateClient.connect(rpc);
		const res = await client.broadcastTx(
			Buffer.from(bytes, "base64")
		);
		assertIsDeliverTxSuccess(res);

		return res;
	};
}
