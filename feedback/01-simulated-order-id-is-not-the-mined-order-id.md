# The orderId a simulated `placeOrderFor` returns is not the orderId the mined transaction creates, so the standard viem simulate-then-write pattern tracks and cancels the wrong order
Severity: major
Area: contracts

The developer page documents the raw/operator entry point as
`placeOrderFor(...) payable returns (bool success, uint128 orderId)` and tells raw callers to
simulate first. With viem, the idiomatic flow is
`const { result: [ok, orderId], request } = await simulateContract(...); await writeContract(request)`.
On Hideki the `orderId` in that `result` is usually not the id the mined order gets: in 6 of 7
live placements the two differed (the one match was a run where no other order landed in between),
so the bug is intermittent, which makes it worse to debug. A bot that keeps the simulated id cannot cancel or reduce its own
order: `cancelOrderFor(owner, simulatedId)` reverts `IncorrectSender(owner, 0x0)` (the id belongs
to nobody), and the real order keeps resting with margin locked.

The id is assigned from pool state at execution time (the low bits look like a running sequence
number; the high bits also move), so any order that lands in between shifts it. On a pool that
trades several times a second this is every time. Nothing in the docs, the "Raw and operator
calls" pitfalls, or the `placeOrderFor` signature says the return value of a simulation is only
a guess. (Related but different: an existing report says `perpPoolWriteAbi.placeOrder` declares
no outputs, so `simulateContract().result` is `undefined`, and proposes adding the outputs so the
simulation "would then be `[true, <orderId>]`". This report shows that even with correct outputs,
that value is not usable as the order id.)

## Steps to reproduce
1. Link a bot key to an app wallet that holds paper USDso (app → Wallet → Link a bot, Perps ticked).
2. With viem, simulate a resting GTC bid far from the touch for the owner, then send the same
   call (script: [`repro/order-id.ts`](../repro/order-id.ts)):
   ```ts
   const args = [OWNER, true, 0n, 70000n * 10n ** 18n, 13000n /* BTC minQuantity */, 2n ** 63n, 0, 0, zeroAddress, 0n]
   const sim = await pc.simulateContract({ address: BTC_POOL, abi, functionName: "placeOrderFor", args, account, gas: 10_000_000n })
   const hash = await wc.writeContract({ address: BTC_POOL, abi, functionName: "placeOrderFor", args, account, gas: 10_000_000n })
   const rc = await pc.waitForTransactionReceipt({ hash })
   console.log(sim.result[1], decodePlaceOrder(rc).orderId)   // decodePlaceOrder from @somnia-chain/markets-sdk
   ```
3. Call `cancelOrderFor(OWNER, sim.result[1])`.

## Expected
Either the simulated `orderId` equals the id of the order the transaction creates, or the docs
(developer page "Raw and operator calls", the Functions page and the SDK's `placeOrderFor`/
`placePerpOrder` docs) say plainly that the return value of an `eth_call` is not the final id and
that the id must be read from the receipt (`OrderPlaced` log / `decodePlaceOrder`).

## Actual
The ids differed in 6 of 7 runs, and cancelling by the simulated id reverts:

| Market | Simulated orderId | Mined orderId | Place tx |
| --- | --- | --- | --- |
| BTC | 11879703183468959633376 (`0x2840000000000800fe0`) | 7913653207621406035938 (`0x1ad0000000000800fe2`) | `0xeebd35e4123905cb186b924cee424d22ffac73f21d17ec799a36d60aa100f4fa` |
| BTC | 8614629482422368998332 (`0x1d300000000008013bc`) | 8614629482422368998336 (`0x1d300000000008013c0`) | `0x493ba79e486b198cd52820b49e06cdbbd15550771056ed05d7f7a0c5c9357ad8` |
| ETH | 16380708737454092327651 (`0x3780000000000a01ae3`) | 16362261993380382776039 (`0x3770000000000a01ae7`) | `0xb1e3aacf2d3f785c6f8a401ab1ca750b19dbb907550ccc7dc6ba0155d4cb704e` |
| BTC | 21582690566240183784410 (`0x49200000000008013da`) | 21582690566240183784411 (`0x49200000000008013db`) | `0x67b367f5b6a14d776cda0184c5d47726f81f0189a5ec4404f8e50e71b2a398d0` |
| BTC | 7950546695768825140849 | 8614629482422368999025 | `0x5bc51bc7207d43252b15999680f4781375ac1b5fc1d1586e7f57fdbbbf096a6f` |
| BTC (run of `repro/order-id.ts`) | 387381625547908980383 | 387381625547908980384 | `0xbf9b2bf1a08d45d91d06cac3ea054fbe07b7e8d91d2940323550578d16ce8caa` |

In one further run of `repro/order-id.ts` the ids matched (cancel by simulated id simulated fine;
the order was cancelled in `0x708b9789adfcc19c03c745b6c1ed15724fdae61605566cb217063a07d315e98f`).

- Cancel with the simulated id from row 1: `cancelOrderFor(0x4C31…6349, 11879703183468959633376)`
  simulated as `IncorrectSender(0x4C31db174698Be4a0aE2E643243307457c846349, 0x0000000000000000000000000000000000000000)`
  and the sent tx `0x3b7a3f6373c00038ad2977b1aab2aac90dbb97ead47b8d5424f77af11ca981bd` mined with status `reverted`.
  The real order stayed on the book with its margin locked until it was cancelled by its mined id
  (`0x384de059d52c6b0d5c996a87b09138aad1ff43c6c1ae188bfdd43ae2e8f2df74`, success).
- In the `repro/order-id.ts` run above, cancelling by the simulated id reverted with a different error,
  `IncorrectOrder` (simulated block 35328043, mined block 35328050); the order was then cancelled by its
  mined id in `0x2614a2ac564fc4e68f5bdf17e63a86b6ad0b65d8b699e086e6b6751b70c9679e`.
- Simulation and mining were 6–10 blocks apart (e.g. simulated at block 35319776, mined at 35319786),
  i.e. well under a second on Hideki.

## Evidence
- Transactions above, Somnia Tokyo / Hideki testnet (chain 50383), explorer
  `https://explorer.testnet.somnia.network/tokyo`.
- Raw JSONL of every call (simulated result, receipt status, gas): `repro/order-id.ts` prints the same
  table; our run log is summarised above.
- `decodePlaceOrder(receipt)` from the SDK returns the mined id (and `fills: []` for these resting orders).

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, viem 2.57.12, Node 22.23.3
- Network: Somnia Tokyo testnet (Hideki, chain 50383), RPC `https://api.hideki2.infra.testnet.somnia.network`
- Owner (app wallet): `0x4C31db174698Be4a0aE2E643243307457c846349`; bot key (linked via Link a bot, Perps): `0xC2E7CcE6CeBBFD866b240611ec7e360F428252A4`
- Pools: BTC-PERP `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`, ETH-PERP read from `listPerpMarkets()`
- Date: 2026-10-28 (UTC)
