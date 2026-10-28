# The newest (still-open) funding candle zero-fills seconds that have not happened yet, so the current hour/4h/day always reads as a funding collapse
Severity: normal
Area: SDK

`listFundingRateCandles` returns `avgFundingRate8h`, which the indexer describes as
"zero-filled by construction (uncovered seconds contribute nothing to the numerator but full
weight to the denominator, which is what a **paused** window should read)". The newest bucket is
not paused, it is simply not finished, but it is computed the same way: every second between
the last settlement and the bucket's end counts as zero funding. The SDK docs warn that
*absent* buckets must be zero-filled and that past buckets get revised, but say nothing about
the open bucket, and the row carries no flag that it is still open. A chart or a funding bot that
reads `rows[0].avgFundingRate8h` sees the current funding at a fraction of its real value.

## Steps to reproduce
1. Read-only client on Hideki (see Environment), BTC-PERP pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`.
2. `await c.listFundingRateCandles(pool, 3600, { limit: 3 })`, `…(pool, 14400, { limit: 2 })`, `…(pool, 86400, { limit: 2 })`.
3. Compare with the raw settlements: `await c.listFundingRateHistory(pool, { limit: 3 })`.
   (Script: [`repro/funding-candles.ts`](../repro/funding-candles.ts).)

## Expected
The open bucket either averages over the seconds actually elapsed/covered so far (and is flagged
as open, e.g. `isOpen` / `bucketEnd > now`), or the docs say that the newest row is partial and
must not be compared with closed buckets. `avgFundingRate8h` should never sit far below the
bucket's own `minFundingRate8h` just because the bucket has not ended.

## Actual
At 2026-10-28 10:46 UTC every settlement in the last 3 h paid between 0.1368% and 0.1435% per 8 h:

| Raw settlement (`listFundingRateHistory`) | `fundingRate` (per 8 h, 1e18) | span |
| --- | --- | --- |
| tx `0x5dbfc69bd94d8ef90659035aa8096ba1818ab995a13978c238ba17130efc7e43` | 1368507038584284 | 1793178703 → 1793182303 |
| tx `0x080f0a941a678ec60f8f51d77ddfb432a8e41082026d2023fa845faf996ef29d` | 1435179722942815 | 1793175103 → 1793178703 |
| tx `0x449af8a5aac55fc2c89053e64a1e16914237ac981f0da28d5bb02429c8c4a4b1` | 1407933269889076 | 1793171503 → 1793175103 |

The candles for the same period:

| Resolution | bucketStart | avgFundingRate8h | min / max | coverage |
| --- | --- | --- | --- | --- |
| 1h (open) | 1793181600 | **267239013367986** (0.027%) | 1368507038584284 / 1368507038584284 | 0.195 |
| 1h (closed) | 1793178000 | 1381526732224297 | 1368507038584284 / 1435179722942815 | 1.0 |
| 4h (open) | 1793174400 | **769656210432609** (0.077%) | 1368507038584284 / 1435179722942815 | 0.549 |
| 4h (closed) | 1793160000 | 1419599584624877 | 1404694632418787 / 1435653899298399 | 1.0 |
| 1d (open) | 1793145600 | **599626479209734** (0.060%) | 1368507038584284 / 1435653899298399 | 0.425 |
| 1d (closed) | 1793059200 | 1385960929985364 | 1119112230395406 / 1500644408163523 | 1.0 |

So the open 1h candle reports ~1/5 of the funding actually being charged, the open day ~43%,
with the average below the bucket's own minimum. Nothing in the row says the bucket is open; the
only hint is `coverage < 1`, which the docs present as the marker of a *gap* ("lets a chart hatch
or grey the slot"), so a chart following the docs greys out the current bar or shows a drop.

## Evidence
Output of `repro/funding-candles.ts` (read-only), run at unix 1793184373 (2026-10-28 10:46:13 UTC):
```
candles [{"bucketStart":"1793181600","avg8h":"267239013367986","min8h":"1368507038584284","max8h":"1368507038584284","coverage":"195277777777777777","updateCount":1},{"bucketStart":"1793178000","avg8h":"1381526732224297","min8h":"1368507038584284","max8h":"1435179722942815","coverage":"1000000000000000000","updateCount":2},…]
4h [{"bucketStart":"1793174400","avg8h":"769656210432609","min8h":"1368507038584284","max8h":"1435179722942815","coverage":"548819444444444444"},{"bucketStart":"1793160000","avg8h":"1419599584624877",…,"coverage":"1000000000000000000"}]
1d [{"bucketStart":"1793145600","avg8h":"599626479209734","min8h":"1368507038584284","max8h":"1435653899298399","coverage":"424803240740740740"},{"bucketStart":"1793059200","avg8h":"1385960929985364",…,"coverage":"1000000000000000000"}]
```
Field descriptions quoted from the indexer's own GraphQL schema
(`__type(name:"FundingRateCandle")` on `https://hideki-dev.smk.somnia.host/v1/graphql`).

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, viem 2.57.12, Node 22.23.3
- Network: Somnia Tokyo testnet (Hideki, chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Wallet: none (read-only)
