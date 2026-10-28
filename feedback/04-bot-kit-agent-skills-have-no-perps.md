# The bot kit's Agent Skills (`skills/dreamdex-bot`, `skills/somnia`) know nothing about perps or the Hideki/Tokyo testnet, so an AI agent following them builds a Shannon spot bot
Severity: normal
Area: docs

The bot kit README advertises `skills/` as "Agent Skills so an AI coding agent can build DreamDEX
bots with the right context". The bounty explicitly invites AI-agent builds on perps. But neither
skill mentions perps at all, and both steer an agent to the wrong network and token for perps.

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (HEAD `2579866`, "fix(perp): point a linked bot's empty Perps balance at Perps ⇆ Spot").
2. `grep -rniE "perp|hideki|50383|tokyo" skills/` → no matches.
3. Read `skills/dreamdex-bot/SKILL.md` and `skills/somnia/SKILL.md`.

## Expected
Since the kit ships `strategies/perp-*`, `packages/perp-core`, `docs/perps.md` and `npm run perp:doctor`,
the skills should at least route perps work there: Hideki testnet (chain 50383, RPC
`https://api.hideki2.infra.testnet.somnia.network`), STT as the gas coin, `NETWORK=hideki`,
`OWNER_ADDRESS` trading-key mode via Link a bot, and a pointer to `docs/perps.md`.

## Actual
- `skills/dreamdex-bot/SKILL.md` `description:` scopes the skill to "market-making, grid, momentum,
  TWAP, mean-reversion, or arbitrage bot, placing or cancelling orders on a DreamDEX **SpotPool**".
  Setup says `cp .env.example .env … keep NETWORK=testnet to start` and "`NETWORK` (`testnet` | `mainnet`)",
  so `hideki` is not even listed as a value. The Core API example loads `SOMI:USDso` and lists the markets as
  "SOMI:USDso, WETH:USDso, WBTC:USDso, USDC.e:USDso" (spot only). Item 13 says builder codes are "0 on testnet".
- `skills/somnia/SKILL.md` lists two networks only (Mainnet `5031`, Shannon `50312`), calls the gas
  token SOMI with no mention that the testnets use STT, and says the SIWE chain id "must match the
  network … (`5031` mainnet / `50312` testnet)". Hideki/Tokyo (`50383`), where every perp market,
  the Perps Arena and the dreamDEX testnet app live, is absent.
- Result: an agent that loads these skills (as the README tells it to) and is asked to "build a
  perps bot" has no route to `perp-core`, and the network facts it is given point it at Shannon.

## Evidence
```
$ grep -rniE "perp|hideki|50383|tokyo" skills/ ; echo "exit=$?"
exit=1
$ sed -n 1,9p skills/dreamdex-bot/SKILL.md
---
name: dreamdex-bot
description: >-
  Build, run, and debug automated trading bots on DreamDEX — Somnia's on-chain
  central limit order book (CLOB) — using this kit. Use when writing or fixing a
  market-making, grid, momentum, TWAP, mean-reversion, or arbitrage bot, placing
  or cancelling orders on a DreamDEX SpotPool, handling order-placement gotchas,
  wiring session-key/operator trading, or measuring whether fills are toxic.
---
$ grep -n "NETWORK" skills/dreamdex-bot/SKILL.md
26:cp .env.example .env         # set PRIVATE_KEY; keep NETWORK=testnet to start
30:Env vars read by core: `PRIVATE_KEY` (funded key), `NETWORK` (`testnet` |
$ grep -n "5031\|50312" skills/somnia/SKILL.md
| **Mainnet** | `5031` | `https://api.infra.mainnet.somnia.network` | `https://explorer.somnia.network` |
| **Shannon Testnet** | `50312` | `https://dream-rpc.somnia.network` | `https://shannon-explorer.somnia.network` |
`50312` testnet). A mismatch causes intermittent auth failures.
```
Meanwhile the same repo's `docs/perps.md` and `packages/perp-core/src/config.ts` make `hideki` the
default perps network.

## Environment
- dreamdex-bot-kit `main` @ `2579866` (cloned 2026-10-28)
- Network: Somnia Tokyo testnet (Hideki, chain 50383) is the target the skills omit
- Wallet: n/a (documentation)
