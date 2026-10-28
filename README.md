# dreamDEX Perps — Feedback track reports

Reproducible feedback for the [dreamDEX Perps Builder Bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail)
(Feedback track), tested on **Somnia Tokyo testnet (Hideki, chain 50383)** with
`@somnia-chain/markets-sdk` 0.32.1, the [dreamDEX bot kit](https://github.com/somnia-chain/dreamdex-bot-kit)
(`main` @ `2579866`) and the testnet app. One issue per file in [`feedback/`](feedback), each in the
bounty template. Every item was reproduced on 2026-10-28 (UTC); live items carry transaction hashes.

Before writing these up we checked the bot kit's GitHub issues and the public feedback repos for this
bounty, and left out anything we found already reported.

| # | Title | Severity | Area |
| --- | --- | --- | --- |
| 01 | [The orderId a simulated `placeOrderFor` returns is not the mined orderId](feedback/01-simulated-order-id-is-not-the-mined-order-id.md) | major | contracts |
| 02 | [`listFundingRateCandles` / `listFundingRateHistory` skip input validation (unsupported resolution → `[]`, `limit: NaN` lifts the page bound)](feedback/02-funding-candles-skip-input-validation.md) | normal | SDK |
| 03 | [The open funding candle zero-fills future seconds and reads as a funding collapse](feedback/03-open-funding-candle-reads-as-a-funding-collapse.md) | normal | SDK |
| 04 | [The bot kit's Agent Skills have no perps / Hideki content](feedback/04-bot-kit-agent-skills-have-no-perps.md) | normal | docs |
| 05 | [App: successful e-mail login flashes "Error: Still waiting for your wallet … Start over"](feedback/05-app-email-login-shows-still-waiting-error.md) | normal | app |
| 06 | [App: Perps Arena join confirmation names a wallet the app never shows](feedback/06-app-arena-join-names-a-wallet-the-app-never-shows.md) | normal | app |

**By severity:** 1 major, 5 normal.

## Reproduce

```bash
cd repro && npm install
npx tsx funding-candles.ts                      # items 02 and 03, read-only, no key
PRIVATE_KEY=0x<bot key> OWNER_ADDRESS=0x<app wallet> npx tsx order-id.ts   # item 01
```

`order-id.ts` needs a bot key linked to an app wallet with **Link a bot** (Perps ticked) and a little
STT for gas; it places one resting BTC-PERP bid far below the touch at the minimum size and cancels
it again.

## Test setup

- Owner (app Wallet 1): `0x4C31db174698Be4a0aE2E643243307457c846349`, funded with Perps Arena paper USDso
- Bot key (throwaway, linked via Link a bot, Perps only): `0xC2E7CcE6CeBBFD866b240611ec7e360F428252A4`
- RPC `https://api.hideki2.infra.testnet.somnia.network`, indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Node 22.23.3, viem 2.57.12

Testnet only. No keys or secrets are stored in this repository.
