// Repro for feedback/01: the orderId returned by simulating placeOrderFor differs from the mined one.
// Usage: PRIVATE_KEY=0x<bot key linked via "Link a bot"> OWNER_ADDRESS=0x<app wallet> npx tsx repro/order-id.ts
// Places a resting BTC-PERP bid far below the touch at minQuantity, compares ids, cancels by the mined id.
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets, contractErrorsAbi, decodePlaceOrder } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { createPublicClient, createWalletClient, http, parseAbi, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)
const OWNER = process.env.OWNER_ADDRESS as `0x${string}`
const pc = createPublicClient({ chain: hidekiTestnet, transport: http() })
const wc = createWalletClient({ chain: hidekiTestnet, transport: http(), account })
const abi = [...parseAbi([
  "function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)",
  "function cancelOrderFor(address owner, uint128 orderId)",
]), ...contractErrorsAbi] as const

const ex = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
const btc = (await ex.client.listPerpMarkets()).find((m: any) => m.baseSymbol === "BTC")!
const pool = btc.poolAddress as `0x${string}`
const args = [OWNER, true, 0n, 70000n * 10n ** 18n, BigInt(btc.minQuantity), 2n ** 63n, 0, 0, zeroAddress, 0n] as const

const sim = await pc.simulateContract({ address: pool, abi, functionName: "placeOrderFor", args, account, gas: 10_000_000n })
const simBlock = await pc.getBlockNumber()
const hash = await wc.writeContract({ address: pool, abi, functionName: "placeOrderFor", args, account, gas: 10_000_000n })
const rc = await pc.waitForTransactionReceipt({ hash })
const mined = BigInt((decodePlaceOrder as any)(rc).orderId)
console.log({ simBlock, minedBlock: rc.blockNumber, hash, simulatedOrderId: sim.result[1], minedOrderId: mined, equal: sim.result[1] === mined })

try {
  await pc.simulateContract({ address: pool, abi, functionName: "cancelOrderFor", args: [OWNER, sim.result[1]], account, gas: 10_000_000n })
  console.log("cancel by simulated id would succeed")
} catch (e: any) {
  console.log("cancel by simulated id reverts:", e.cause?.data?.errorName, e.cause?.data?.args)
}
const c = await wc.writeContract({ address: pool, abi, functionName: "cancelOrderFor", args: [OWNER, mined], account, gas: 10_000_000n })
console.log("cancelled by mined id:", (await pc.waitForTransactionReceipt({ hash: c })).status, c)
await ex.close()
