# App: the Perps Arena join confirmation names a wallet (`0xEd43…9d79`) that the app never shows again and that has no on-chain link to the account that trades
Severity: normal
Area: app

After **Join Perps Arena** the app confirms which wallet was entered. The address it names is not
the account the app shows, trades from, credits the 1,000 paper USDso to, or links bots to. It
appears nowhere else in the app, is not an owner of the trading wallet on either testnet, and has
never sent a transaction. A trader therefore cannot tell from the app which address is scored on
the leaderboard, or check that the entry matches the account they trade.

## Steps to reproduce
1. Sign in to https://app.testnet.dreamdex.io with **Log in with email** (new account).
2. Open https://app.testnet.dreamdex.io/competition-hub → **Join Perps Arena** and complete the join.
3. Read the confirmation, then open the header wallet menu, **Manage → Wallets**, **Wallet 1** detail and `/portfolio`; search each for the confirmed address.
4. On chain, read the trading wallet's owners and the confirmed address on both testnets:
   ```ts
   // same call against https://api.hideki2.infra.testnet.somnia.network (50383) and https://api.infra.testnet.somnia.network (50312)
   readContract({ address: "0x4C31db174698Be4a0aE2E643243307457c846349", abi: parseAbi(["function getOwners() view returns (address[])", "function isOwner(address) view returns (bool)"]), functionName: "getOwners" })
   readContract({ …, functionName: "isOwner", args: ["0xEd43DeD23c92484b563bddE58BFfD6F01B939d79"] })
   getTransactionCount({ address: "0xEd43DeD23c92484b563bddE58BFfD6F01B939d79" }); getCode({ address: "0xEd43…9d79" })
   ```

## Expected
The confirmation names the wallet the app trades and shows (here Wallet 1
`0x4C31db174698Be4a0aE2E643243307457c846349`), or, if the Arena registers a different identity
(for example the login key), the app labels it as such and shows it somewhere (wallet menu,
Arena page, leaderboard entry) so the user can match it to their trading account.

## Actual
- Confirmation text, verbatim: "You're in the Arena. Wallet 0xEd43DeD23c92484b563bddE58BFfD6F01B939d79 is entered in the dreamDEX Perps Arena. Your perps trades during the competition count toward your quests."
- The wallet menu lists exactly one wallet: "Wallet 1 · Main · 0x4C31db174698Be4a0aE2E643243307457c846349". Manage shows the signing key "THIS APP / DreamDEX / 0x61…c189". Ctrl+F "Ed43" on the wallet menu, Manage, Wallets, Wallet 1 detail and `/portfolio`: 0 matches.
- The paper USDso voucher and the STT the account received sit on `0x4C31…6349` (wallet menu: "STT 19.31 · USDso Voucher · DreamDEX $1,000.00"; on chain `getPerpVoucher(marginBank, 0x4C31…)` → `{"claimed":true,"floor":"1000000000000000000000","expiresAt":"1794392786"}`).
- On chain, on **both** Hideki (50383) and Shannon (50312): `getOwners()` of `0x4C31…6349` = `[0x61478cae988359fD7B3f11bA3032E852A4A9c189]` (the app signing key), `isOwner(0xEd43…9d79)` = `false`; `0xEd43…9d79` has no code and nonce `0x0` on both chains.
- Wallet 1's detail page says "How this wallet is controlled: Your login wallet / the key everything here hangs from / OWNS Wallet 1", but it never displays the login wallet's address, so the user cannot check whether `0xEd43…` is that login wallet.

## Evidence
- Join confirmation captured 2026-10-28 ≈10:22 UTC on https://app.testnet.dreamdex.io/competition; wallet-menu and Ctrl+F sweep ≈10:50 UTC (text above copied from the page).
- RPC reads at Hideki block ≈35,315,000 and the Shannon head at the same time (2026-10-28 ≈10:55 UTC); calls listed in step 4.

## Environment
- App: https://app.testnet.dreamdex.io (Privy e-mail login), desktop Chromium
- Network: Somnia Tokyo testnet (Hideki, chain 50383); cross-checked on Shannon (50312)
- Wallets: trading Wallet 1 `0x4C31db174698Be4a0aE2E643243307457c846349`, app signing key `0x61478cae988359fD7B3f11bA3032E852A4A9c189`, address named by the Arena `0xEd43DeD23c92484b563bddE58BFfD6F01B939d79`
