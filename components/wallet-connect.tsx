"use client"

import { useState } from "react"
import { web3Service } from "@/lib/web3-service"
import { truncateAddress } from "@/lib/utils"
import { Wallet, LogOut, Circle } from "lucide-react"

export function WalletConnect() {
    const [isConnecting, setIsConnecting] = useState(false)
    const [wallet, setWallet] = useState<{
        address: string
        balance: string
        isConnected: boolean
    } | null>(null)

    const handleConnect = async () => {
        setIsConnecting(true)
        try {
            const connection = await web3Service.connectWallet()
            setWallet({
                address: connection.address,
                balance: connection.balance,
                isConnected: true,
            })
        } catch (error) {
            console.error("Failed to connect wallet:", error)
        } finally {
            setIsConnecting(false)
        }
    }

    const handleDisconnect = async () => {
        await web3Service.disconnectWallet()
        setWallet(null)
    }

    if (wallet?.isConnected) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                    <Circle className="h-2 w-2 fill-verification-verified text-verification-verified" />
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Balance</span>
                        <span className="text-sm font-medium">{wallet.balance} ETH</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{truncateAddress(wallet.address)}</span>
                </div>
                <button
                    onClick={handleDisconnect}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                    aria-label="Disconnect wallet"
                >
                    <LogOut className="h-4 w-4" />
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
            <Wallet className="h-4 w-4" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
    )
}
