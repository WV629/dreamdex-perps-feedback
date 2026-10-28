# `listFundingRateCandles` / `listFundingRateHistory` skip the SDK's input checks: an unsupported resolution returns `[]`, `limit: NaN` lifts the page bound, and bad numbers surface as raw indexer errors
Severity: normal
Area: SDK

`client.listFundingRateCandles(pool, intervalSeconds, opts)` is documented for exactly three
resolutions (`3600 | 14400 | 86400`), and the SDK's other indexer list reads promise that bad
paging input is rejected **before** the request (e.g. `listVaultPayoutFallbacks`: "`opts.offset` is
not a non-negative safe integer … Checked before the request: `NaN` and `Infinity` are ordinary
`number` values that would serialize to `null` and lift the page bound"). The two funding
history reads do none of this: the arguments are passed straight into the GraphQL `where`/`limit`
(`src/perp/history.ts`, `listFundingRateCandles`).

## Steps to reproduce
1. `const c = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES }).client`
2. `pool = (await c.listPerpMarkets()).find(m => m.baseSymbol === "BTC").poolAddress`
3. Call (script: [`repro/funding-candles.ts`](../repro/funding-candles.ts)):
   - `c.listFundingRateCandles(pool, 60 | 0 | -3600 | 7200, { limit: 2 })`
   - `c.listFundingRateCandles(pool, 1.5)` and `c.listFundingRateCandles(pool, NaN)`
   - `c.listFundingRateCandles(pool, 3600, { limit: NaN | -1 | 1.5 | 5000 })`
   - `c.listFundingRateHistory(pool, { limit: -1 | 1.5 | 5000 })`

## Expected
An `InvalidInputError` naming the bad argument, before any request: for a resolution outside
`3600 | 14400 | 86400`, and for a `limit` that is not a whole number in the allowed range (as the
other list reads do). In particular `limit: NaN` must not turn into "no limit".

## Actual
| Call | Result |
| --- | --- |
| interval `60`, `0`, `-3600`, `7200` | `OK rows=0` — an empty array, indistinguishable from "no funding data" |
| interval `1.5` | `IndexerError … indexer FundingRateCandles failed: The value 1.5 lies outside the bounds or is not an integer. Maybe it is a float, or is there integer overflow?` |
| interval `NaN` | `IndexerError … unexpected null value for type 'Int'` |
| candles `limit: NaN` | **`OK rows=857`** — the default 500 page bound is gone and the whole table comes back |
| candles `limit: 5000` | `OK rows=857` (no upper bound; other list reads cap at 1000) |
| candles `limit: -1` | `IndexerError … expected a non-negative 32-bit integer for type 'Int', but found a number` |
| candles / history `limit: 1.5` | `IndexerError … The value 1.5 lies outside the bounds or is not an integer…` |
| history `limit: 5000` | `OK rows=855` |

Valid resolutions work (`3600` → newest bucket `1793181600`, `14400` → `1793174400`, `86400` → `1793145600`).
The silent `[]` for an unsupported resolution is the costly case: a chart or a funding bot that
asks for 1-minute or 2-hour buckets gets "no funding ever happened" with no error.

## Evidence
Output of `repro/funding-candles.ts`, run 2026-10-28 10:46 UTC (unix 1793184373) against
BTC-PERP `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`:
```
interval 3600: OK rows=2 first bucketStart=1793181600
interval 14400: OK rows=2 first bucketStart=1793174400
interval 86400: OK rows=2 first bucketStart=1793145600
interval 60: OK rows=0
interval 0: OK rows=0
interval -3600: OK rows=0
interval 1.5: IndexerError @somnia-chain/markets-sdk: indexer FundingRateCandles failed: The value 1.5 lies outside the bounds or is not an integer. Maybe it is a float, or is there integer overflow?
interval 7200: OK rows=0
interval NaN: IndexerError @somnia-chain/markets-sdk: indexer FundingRateCandles failed: unexpected null value for type 'Int'
limit 0: OK rows=0
limit -1: IndexerError @somnia-chain/markets-sdk: indexer FundingRateCandles failed: expected a non-negative 32-bit integer for type 'Int', but found a number
limit 1.5: IndexerError @somnia-chain/markets-sdk: indexer FundingRateCandles failed: The value 1.5 lies outside the bounds or is not an integer. Maybe it is a float, or is there integer overflow?
limit 5000: OK rows=857
limit NaN: OK rows=857
history limit 0: OK rows=0
history limit -1: IndexerError @somnia-chain/markets-sdk: indexer FundingRateHistory failed: expected a non-negative 32-bit integer for type 'Int', but found a number
history limit 1.5: IndexerError @somnia-chain/markets-sdk: indexer FundingRateHistory failed: The value 1.5 lies outside the bounds or is not an integer. Maybe it is a float, or is there integer overflow?
history limit 5000: OK rows=855
```
Read-only; no wallet needed.

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, viem 2.57.12, Node 22.23.3
- Network: Somnia Tokyo testnet (Hideki, chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Wallet: none (read-only)
