"use client"
import Image from "next/image";
import { NetworkContext } from "./providers/network";
import { WalletContext, useWallet } from "./providers/wallet";
import WalletConnect from "./(components)/WalletConnect";
import { useState } from "react";
import TransactionModal from "./(components)/(transaction)/TransactionModal";
import SidebarNetwork from "./(components)/SidebarNetwork";

export default function Home() {
  
  return (
    <NetworkContext>
      <WalletContext>
        <SidebarNetwork />
        <MainContent />
      </WalletContext>
    </NetworkContext>
  );
}

const MainContent = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { account, disconnect } = useWallet();

  const disconnectAccount = () => {
		disconnect()
		// might cause interference with other logic
		localStorage.clear()
		setIsOpen(false)
	}

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Welcome to the Wallet</h1>
      <p className="mt-4 text-lg">Connect your wallet to get started</p>

      {!account && <WalletConnect />}
        {account && <div className="mt-20">
          <button onClick={() => setIsOpen(true)} className="bg-slate-500 py-4 px-2 text-white hover:bg-slate-800">
            Open Transaction modal
          </button>
          <button onClick={disconnectAccount} className="bg-slate-500 ml-5 py-4 px-2 text-white hover:bg-slate-800">Disconnect</button>

          <TransactionModal isOpen={isOpen} setIsOpen={setIsOpen} transactionType={"deposit"}  />
        </div>}
    </div>
  );
}