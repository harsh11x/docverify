/**
 * Web3 service — MetaMask / ethers.js wallet integration.
 */

export interface WalletConnection {
    address: string
    chainId: number
    balance: string
    isConnected: boolean
}

export interface NetworkInfo {
    chainId: number
    name: string
    blockNumber: number
}

declare global {
    interface Window {
        ethereum?: any
    }
}

class Web3Service {
    private connected: boolean = false
    private currentAddress: string | null = null
    private chainId: number = 0

    /**
     * Connect wallet via MetaMask (window.ethereum).
     * Falls back to a read-only mock if MetaMask is not installed.
     */
    async connectWallet(): Promise<WalletConnection> {
        if (typeof window !== "undefined" && window.ethereum) {
            try {
                // Request account access
                const accounts: string[] = await window.ethereum.request({
                    method: "eth_requestAccounts",
                })

                this.currentAddress = accounts[0]
                this.connected = true

                // Get chain ID
                const chainIdHex: string = await window.ethereum.request({
                    method: "eth_chainId",
                })
                this.chainId = parseInt(chainIdHex, 16)

                // Get balance
                const balanceHex: string = await window.ethereum.request({
                    method: "eth_getBalance",
                    params: [this.currentAddress, "latest"],
                })
                const balanceWei = BigInt(balanceHex)
                const balanceEth = (Number(balanceWei) / 1e18).toFixed(4)

                // Listen for account/chain changes
                window.ethereum.on("accountsChanged", (accts: string[]) => {
                    this.currentAddress = accts[0] || null
                    this.connected = !!accts[0]
                })
                window.ethereum.on("chainChanged", (newChainId: string) => {
                    this.chainId = parseInt(newChainId, 16)
                    window.location.reload()
                })

                return {
                    address: this.currentAddress!,
                    chainId: this.chainId,
                    balance: balanceEth,
                    isConnected: true,
                }
            } catch (err: any) {
                console.error("[Web3Service] connectWallet error:", err)
                throw new Error(err.message || "Failed to connect wallet")
            }
        }

        // Fallback: no MetaMask — return unconnected state
        console.warn("[Web3Service] No MetaMask found. Install MetaMask to connect a wallet.")
        throw new Error("MetaMask not found. Please install MetaMask browser extension.")
    }

    async disconnectWallet(): Promise<void> {
        this.connected = false
        this.currentAddress = null
        this.chainId = 0
    }

    async getNetwork(): Promise<NetworkInfo> {
        if (typeof window !== "undefined" && window.ethereum) {
            const chainIdHex: string = await window.ethereum.request({ method: "eth_chainId" })
            const chainId = parseInt(chainIdHex, 16)
            const blockHex: string = await window.ethereum.request({ method: "eth_blockNumber" })
            const blockNumber = parseInt(blockHex, 16)

            const names: Record<number, string> = {
                1: "Ethereum Mainnet",
                11155111: "Sepolia Testnet",
                31337: "Hardhat Local",
                1337: "Ganache Local",
            }

            return {
                chainId,
                name: names[chainId] || `Chain ${chainId}`,
                blockNumber,
            }
        }
        return { chainId: 0, name: "Unknown", blockNumber: 0 }
    }

    async switchNetwork(chainId: number): Promise<void> {
        if (typeof window !== "undefined" && window.ethereum) {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x" + chainId.toString(16) }],
            })
        }
    }

    isConnected(): boolean {
        return this.connected
    }

    getCurrentAddress(): string | null {
        return this.currentAddress
    }

    async submitTransaction(data: any): Promise<string> {
        if (!this.connected || !this.currentAddress) {
            throw new Error("Wallet not connected")
        }
        if (typeof window !== "undefined" && window.ethereum) {
            const txHash: string = await window.ethereum.request({
                method: "eth_sendTransaction",
                params: [{ from: this.currentAddress, ...data }],
            })
            return txHash
        }
        throw new Error("MetaMask not available")
    }

    async waitForTransaction(txHash: string): Promise<any> {
        // Poll for receipt
        if (typeof window !== "undefined" && window.ethereum) {
            for (let i = 0; i < 30; i++) {
                const receipt = await window.ethereum.request({
                    method: "eth_getTransactionReceipt",
                    params: [txHash],
                })
                if (receipt) return receipt
                await new Promise((r) => setTimeout(r, 2000))
            }
        }
        throw new Error("Transaction receipt not found after timeout")
    }
}

export const web3Service = new Web3Service()
