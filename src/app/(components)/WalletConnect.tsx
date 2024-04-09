"use client"
import React, { useEffect, useState } from 'react'
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Adapter, useWallet } from '../providers/wallet';
import { useLocalStorage } from '../hooks';
import TileWithGradientBorder from './TileWithGradientBorder';
import { IconSonar } from '../icons';
import { EyeIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

const WalletConnect = () => {
	const { account, connect } = useWallet();
	const [address, setAddress] = useLocalStorage('address', '');
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	// useEffect(() => {
	// 	if (account) {
	// 		setAddress(account.address);
	// 		router.replace('/home');
	// 	}
	// }
	// , [account, setAddress, router]);

	const handleConnect = async (walletAdapter: Adapter) => {
		console.log(`connect ${walletAdapter}`);
		setIsLoading(true);
		await new Promise(resolve => setTimeout(resolve, 100)); // Simulate a delay for state update
		if (connect) {
			connect(walletAdapter);
			console.log(`connected ${account}`);
		}
	};

	return (
		<div className='grid grid-cols-1 grid-rows-3 gap-y-3 xl:grid-cols-3 xl:grid-rows-1 xl:gap-x-3 w-full'>
			<div className='flex relative' onClick={() => handleConnect(Adapter.Sonar)}>
				<TileWithGradientBorder addStyle="cursor-pointer">
					{isLoading && <LoadingSpinner width='w-10' height='h-10' />}
					{!isLoading && <button aria-label="Connect Sonar Wallet" disabled>
						<IconSonar className='w-32' />
					</button>}
					{/* gray overlay for disabling */}
					{/* TODO: Enable Sonar for Mainnet */}
					<div className='absolute bg-neutral-800 bg-opacity-50 rounded-xl w-full h-full'></div>
				</TileWithGradientBorder>
			</div>
			<button aria-label="Connect Keplr Wallet" onClick={() => handleConnect(Adapter.Keplr)}>
				<TileWithGradientBorder>
					{isLoading && <LoadingSpinner width='w-10' height='h-10' />}
					{!isLoading && <Image src="/keplr_wallet_logo.png" alt="Keplr wallet logo" width={128} height={50} />}
				</TileWithGradientBorder>
			</button>
			<div className='flex' onClick={() => handleConnect(Adapter.ReadOnly)}>
				<TileWithGradientBorder addStyle="cursor-pointer">
					{isLoading && <LoadingSpinner width='w-10' height='h-10' />}
					{!isLoading && <button aria-label="Connect Demo Account" className='text-2xl flex items-center gap-x-2'>
						<EyeIcon className='w-6' /> DEMO
					</button>}
				</TileWithGradientBorder>
			</div>
		</div>
	)
}

export default WalletConnect