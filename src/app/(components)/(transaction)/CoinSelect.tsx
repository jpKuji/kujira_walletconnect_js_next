import { useState, Fragment, Dispatch, SetStateAction } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/20/solid'
import { ChevronUpDownIcon } from '@heroicons/react/24/outline'

const denomsDeposit = [
	{ name: "USK", value: "factory/kujira1r85reqy6h0lu02vyz0hnzhv5whsns55gdt4w0d7ft87utzk7u0wqr4ssll/uusk"},
	{ name: "USDC", value: "123"},
	{ name: "USDC.axl", value: "123 "},
]

const denomsWithdraw = [
	{ name: "naUSD", value: "factory/kujira1qs9hp47w86tvftrwj57tu0nn3xkeltmzs94w6knnjx8gnefmzsjqwg2986/unausd"},
]

type Props = {
    transactionType: "deposit" | "withdraw"; 
    setDenom: Dispatch<SetStateAction<string>>;
}


export function CoinSelect(props:Props) {
	const [selectedDenom, setSelectedDenom] = useState(props.transactionType === "deposit"? denomsDeposit[0] : denomsWithdraw[0])
    
	const handleChange = (newDenom: { name: string; value: string; }) => {
		if (!newDenom) return console.log("Invalid denom")
		console.log("newDenom", newDenom)
		setSelectedDenom(newDenom)
		props.setDenom(newDenom.value)
	}
	return (
		<Listbox value={selectedDenom} onChange={handleChange}>
			{({ open }) => (
				<>
					<div className="relative mt-2 w-full">
						<Listbox.Button className="relative w-full cursor-default rounded-md py-1.5 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-highlight focus:outline-none focus:ring-2 sm:leading-6 text-lg">
							<span className="block truncate">{selectedDenom.name}</span>
							<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
								<ChevronUpDownIcon className="h-5 w-5 text-highlight" aria-hidden="true" />
							</span>
						</Listbox.Button>
  
						<Transition
							show={open}
							as={Fragment}
							leave="transition ease-in duration-100"
							leaveFrom="opacity-100"
							leaveTo="opacity-0"
						>
							<Listbox.Options className="absolute z-10 max-h-60 w-full overflow-auto rounded-md bg-neutral-800 mt-1">
								{props.transactionType === "deposit" ? denomsDeposit.map((denom) => (
									/* Use the `active` state to conditionally style the active option. */
									/* Use the `selected` state to conditionally style the selected option. */
									<Listbox.Option key={denom.value} value={denom} className={({ active }) => `${active ? 'text-primary bg-highlight' : 'text-highlight/50'} cursor-default select-none relative py-2 pl-10 pr-4 rounded-md`} disabled={denom.name === "USDC" || denom.name === "USDC.axl"}>
										{({ selected, active }) => (
											<>
												<span className={`${selected ? 'font-medium' : 'font-normal'} block truncate`}>{denom.name}</span>
												{selected ? (
													<span className={`${active ? 'text-primary' : 'text-white'} absolute inset-y-0 left-0 flex items-center pl-3`}>
														<CheckIcon className="h-5 w-5" aria-hidden="true" />
													</span>
												) : null}
											</>
										)}
									</Listbox.Option>
								))
									:
									denomsWithdraw.map((denom) => (
										<Listbox.Option key={denom.value} value={denom} className={({ active }) => `${active ? 'text-primary bg-highlight' : 'text-highlight/50'} cursor-default select-none relative py-2 pl-10 pr-4 rounded-md`} disabled={denom.name === "USDC" || denom.name === "USDC.axl"}>
											{({ selected, active }) => (
												<>
													<span className={`${selected ? 'font-medium' : 'font-normal'} block truncate`}>{denom.name}</span>
													{selected ? (
														<span className={`${active ? 'text-primary' : 'text-white'} absolute inset-y-0 left-0 flex items-center pl-3`}>
															<CheckIcon className="h-5 w-5" aria-hidden="true" />
														</span>
													) : null}
												</>
											)}
										</Listbox.Option>
									))
								}
							</Listbox.Options>
						</Transition>
					</div>
				</>
			)}
		</Listbox>
	)
}