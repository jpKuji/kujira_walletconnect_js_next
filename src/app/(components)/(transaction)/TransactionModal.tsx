"use client"
import React, { useState } from 'react'
import { ModalTemplate } from '../ModalTemplate'
import { AmountInput } from './AmountInput'
import { useTokenAmount } from '../../hooks/useTokenAmount'
import { useWallet } from '../../providers/wallet'
import { motion } from 'framer-motion'
import { Coin } from '@keplr-wallet/types'
import { EncodeObject } from '@cosmjs/proto-signing'
import { DeliverTxResponse } from '@cosmjs/stargate'
import LoadingSpinner from '../LoadingSpinner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TileWithGradientBorder from '../TileWithGradientBorder'
import { useNetwork } from '../../providers/network'
import { CoinSelect } from './CoinSelect'

type Props = {
    transactionType: "deposit" | "withdraw",
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
}

const TransactionModal = (props: Props) => {
	const [denom, setDenom] = useState<string>("factory/kujira1r85reqy6h0lu02vyz0hnzhv5whsns55gdt4w0d7ft87utzk7u0wqr4ssll/uusk")
	const [transactionResult, setTransactionResult] = useState<"working" | DeliverTxResponse | Error | null>(null)

	const [[amount, setAmount], [amountInt, setAmountInt]] = useTokenAmount(6);
	const { account, balances, signAndBroadcast } = useWallet();

	const handleTransaction = async (type:string) => {
		if (!account) return console.error('Account not found')
		const coin: Coin = { denom: denom, amount: amountInt.toString() };

		let encoder = new TextEncoder();
		let executeMsg: EncodeObject | undefined;

		const action = type === "deposit" ? "Deposit" : "Withdraw"
        
		executeMsg = {
			typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
			value: {
				  sender: account.address, // Address of the sender executing the contract
				  contract: "kujira1qs9hp47w86tvftrwj57tu0nn3xkeltmzs94w6knnjx8gnefmzsjqwg2986", // Address of the smart contract
				  msg: encoder.encode(JSON.stringify({
					// Message payload for the contract execution
					// This is where you define the action and parameters for the contract
					// For example, to vote in a poll, you might have:
					[action]: {}
				  })),
				  funds: [coin],
			},
		};

		await submit([executeMsg])
	}

	const submit = (data: any) => {
		if (!data || data.error) return console.error(data.error)
		// if signed, show a process spinner
		setTransactionResult("working");
		signAndBroadcast(data)
			.then(async (response: DeliverTxResponse) => {
				// Handle the response here
				setTransactionResult(response);
			} // You may need to adjust this line based on your actual types
			)
			.catch((error: Error) => {
				// Handle the error here
				console.error("error from sign and broadcast", error);
				setTransactionResult(error);
			})
	}

	const handleDepositWithdraw = async () => {
		if (!amount) return console.error('Transaction amount missing')
		if (!denom) return console.error('Transaction denom missing')
	
		if (props.transactionType === "deposit") {
			await handleTransaction("deposit");
		} else {
			await handleTransaction("withdraw");
		}
		props.setIsOpen(false)
	}
    
	return (
		<ModalTemplate isOpen={props.isOpen} onClose={() => props.setIsOpen(false)}>
			{transactionResult && <TranscationProcess transactionResult={transactionResult} setOpen={props.setIsOpen} />}
			{!transactionResult && <div className='flex flex-col w-full p-5 items-center'>
				<h1 className='text-2xl font-semibold mb-3 w-full'>How much do you want to {props.transactionType.toLowerCase()}?</h1>
				<CoinSelect transactionType={props.transactionType} setDenom={setDenom}  />
				<AmountInput amount={amount} setAmount={setAmount} setAmountInt={setAmountInt} transactionType={props.transactionType} max={balances.find((balance) => balance.denom === denom)?.amount} />
				{ amount && <p className='font-medium mt-2'>
                        You&apos;re about to {props.transactionType.toLowerCase()} <span className='font-extrabold'>{amount} {denom === "factory/kujira1r85reqy6h0lu02vyz0hnzhv5whsns55gdt4w0d7ft87utzk7u0wqr4ssll/uusk" ? "USK" : denom === "" ? "" : denom === "" ? "" : ""} </span>{props.transactionType === "deposit" ? "to" : "from"} your vault.
				</p>}

				<motion.button 
					className='uppercase font-bold bg-highlight text-primary w-full lg:w-1/2 px-4 py-3 rounded-xl shadow-md shadow-highlight/20 mt-5'
					whileTap={{ scale: 0.95 }}
					whileHover={{ scale: 1.05 }}
					onClick={handleDepositWithdraw}
				>
					{props.transactionType === "deposit" ? "Deposit" : "Withdraw"}
				</motion.button>
			</div>
			}
		</ModalTemplate>
	)
}

export default TransactionModal

const TranscationProcess = ({transactionResult, setOpen}: { transactionResult: DeliverTxResponse | Error | "working"; setOpen: (open: boolean) => void;}) => {
	const router = useRouter()
	const [{network}] = useNetwork()

	return (
		<div className='flex flex-col w-full p-5 z-50'>
			{/* You can use a spinner here */}
			{transactionResult === "working"  && (
				<div className="flex flex-col w-full">
					<h1 className='font-semibold text-2xl mb-10'>Processing your money...</h1>
					<LoadingSpinner width='w-28' height='h-28' />
				</div>
			) }
			{typeof transactionResult === 'object' && 'transactionHash' in transactionResult && (
				<div className='flex flex-col'>
					<h1 className='text-2xl pb-5 font-semibold text-green-600'>Processed!</h1>
					<p className='text-xl break-all pb-2'>Transaction (Finder):</p>
					<Link href={`https://finder.kujira.network/${network}/tx/${transactionResult.transactionHash}`} target='_blank' className='text-highlight break-all text-lg hover:text-neutral-400'>{transactionResult.transactionHash}</Link>
					{/* Optionally, navigate away or close the modal */}

					<button onClick={() => router.push('/home/vaults')} className='w-full flex justify-center hover:cursor-pointer mt-10 text-xl'>
						<TileWithGradientBorder>
									Close
						</TileWithGradientBorder>
					</button>
				</div>
			)}
			{transactionResult instanceof Error && (
				<div className='flex flex-col w-full'>
					<h2 className='text-2xl font-semibold pb-5'>Oh no! An error occured.</h2>
					<p className='text-xl font-bold break-all'>Error: <span className='text-red-500 font-normal'>{transactionResult.message}</span></p>
					<p className='text-xl pt-5'>Copy the error and visit our <Link href={"https://t.me/NAMIProtocol"} className='font-extrabold text-highlight hover:text-neutral-500'>Telegram</Link > or <Link href={"https://discord.gg/WGgUADfxXR"} className='font-extrabold text-highlight hover:text-neutral-500'>Discord</Link> for help.</p>

					<button onClick={() => setOpen(false)} className='w-full flex justify-center hover:cursor-pointer mt-10 text-xl'>
						<TileWithGradientBorder>
									Close
						</TileWithGradientBorder>
					</button>
				</div>
			)}
		</div>
	)
}