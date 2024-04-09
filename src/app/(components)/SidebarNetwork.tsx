"use client"
import React, { useEffect, useState } from 'react'
import { Disclosure, Switch } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { motion } from 'framer-motion';

import { useNetwork } from '../providers/network'
import { NETWORKS } from 'kujira.js'
import { Select } from './Select'
import { useChannel } from '../providers/realtime'

type Props = {}

const SidebarNetwork = (props: Props) => {
	const [isTestnet, setIsTestnet] = useState(true)
	const [{ network, rpcs, rpc, setRpc, preferred, tmClient }, setNetwork] = useNetwork();

	const handleNetworkChange = () => {
		const newNetwork = network === "kaiyo-1" ? "harpoon-4" : "kaiyo-1";
		setNetwork(newNetwork);
	};
	useEffect(() => {
		setIsTestnet(network === "harpoon-4");
	}, [network]);

	const status = (latency: number) => latency > 2000 ? "red-500" : latency > 750 ? `amber-500` : "green-500";
	const latency = rpcs.find((r) => r.endpoint === rpc)?.latency || 0;

	const [blockTime, setBlockTime] = useState<null | number>(null);
	const [lag, setLag] = useState(10000);

	const [block, setBlock] = useState<null | {
    height: number;
  }>();

	const blockChannel = useChannel("block:all");

	useEffect(() => {
		blockChannel?.on(
			"new_block",
			({ body }: { body: { height: number } }) => {
				setBlock({ height: body.height });
			}
		);
		return blockChannel?.off("new_block");
	}, [blockChannel]);

	useEffect(() => {
		tmClient?.block().then(({ block }) => {
			if (!block?.header?.height) return;
			const height = block.header.height;
			setBlock({
				height: block.header.height,
			});
			const diff = new Date().getTime() - block.header.time.getTime();

			setLag(diff);

			tmClient?.block(height - 1000).then(({ block }) => {
				if (!block?.header?.time) return;
				const time = block.header.time;
				const diff = new Date().getTime() - time.getTime();
				setBlockTime(diff / 1000);
			});
		});
	}, [tmClient]);
	return (
		// TODO: activate network switch for MVP Launch
		<>
			<div className='flex items-center mt-5'>
				<Switch
					disabled
					checked={isTestnet}
					onChange={handleNetworkChange}
					className={`${
						isTestnet ? 'bg-highlight/50' : 'bg-highlight/50'
					} relative inline-flex h-6 w-11 items-center rounded-full`}
				>
					<span className="sr-only">Enable notifications</span>
					<span
						className={`${
							isTestnet ? 'translate-x-6 bg-primary' : 'translate-x-1 bg-highlight'
						} inline-block h-4 w-4 transform rounded-full transition`}
					/>
				</Switch>
				<span className={`ml-3 font-semibold ${isTestnet ? "text-highlight/50" : "text-highlight/50"}`}>Testnet</span>
			</div>
        
			<Disclosure>
				{({ open }) => (
					<>
						<Disclosure.Button as={motion.div} whileTap={{ scale: 0.95 }} className="hover:cursor-pointer text-highlight/50 hover:text-highlight flex flex-col items-center justify-center w-full mt-3">
							<p className='w-full'>Advanced</p>
							<div className='w-full flex items-center justify-center'>
								<div className="w-full bg-highlight/50 h-0.5 "></div>
								<ChevronDownIcon
									className={`${open ? 'transform rotate-180' : ''} w-5 h-5`}
								/>
							</div>
						</Disclosure.Button>
						<Disclosure.Panel
							as={motion.div}
							initial={false}
							animate={{ height: open ? 'auto' : 0 }}
							transition={{ duration: 0.2 }}
							className="py-1 text-sm text-white"
						>
							{/* Place your switch component here */}
							<div>
								{ Object.entries(NETWORKS).length > 1 && (
									<>
										<div>
                    Connected to: {network}		
										</div>
										<Select
											className="text-sm"
											options={rpcs
												.sort((a, b) => b.latency - a.latency)
												.map((e) => ({
													label: `${e.endpoint}`,
													value: e.endpoint,
													status: status(e.latency),
												}))}
											selected={{
												label: rpc || "",
												value: rpc || "",
												status: status(latency),
											}}
											// disabled={locked}
											allowCustomInput={true}
											onCustomChange={(v) => setRpc(v)}
											onChange={(v) => setRpc(v)}
											suffix={(v) => (
												<small className="color-lightGrey ml-q1">
({rpcs.find((r) => r.endpoint === v.value)?.latency || 0}
ms,{" "}
													{rpcs
														.find((r) => r.endpoint === v.value)
														?.latestBlockTime.toLocaleString()}
)
												</small>
											)}
										/>
										<div className="flex flex-col">
											{/* 750 latency = green. 2 blocks (5.6s) = green */}
											<div className="flex items-center gap-x-2">
												<span>Block height</span>
												<span className="color-white ml-q1">
													{block && block.height.toLocaleString()}
												</span>
											</div>
											<div className="flex items-center gap-x-2">
												<span className="">Block speed</span>
												<span className="color-white ml-q1">
													{Math.round(blockTime || 0).toLocaleString()}ms
												</span>
											</div>
										</div>
									</>
								)}
							</div>
						</Disclosure.Panel>
					</>
				)}
			</Disclosure>
		</>
	)
}

export default SidebarNetwork