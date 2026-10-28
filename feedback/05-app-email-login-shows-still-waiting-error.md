# App: a successful e-mail login flashes "Error: Still waiting for your wallet … Start over" next to "Success!"
Severity: normal
Area: app

Signing in to the testnet app with "Log in with email or socials" succeeds, but the moment the
6-digit code is accepted the login modal renders an error block, with a **Start over** button,
in the same paint as "Success!". The error says the wallet "still hasn't responded" and that
starting over "discards any request already open in your wallet". For an e-mail (embedded wallet)
login there is no external wallet to respond, and pressing the button during that window would
throw away a login that has in fact completed. Reproduced on two separate sign-ins.

## Steps to reproduce
1. Open https://app.testnet.dreamdex.io/competition (or any app page) signed out, press **Connect**.
2. Choose **Log in with email or socials**, enter an e-mail address, submit.
3. Enter the 6-digit code from the privy.io e-mail ("Enter confirmation code"; the modal auto-submits on the 6th digit).
4. Watch the modal immediately after the last digit.

## Expected
A "Creating your wallet… / Success!" state only, then the signed-in header. No "Error" and no
"Start over" for a login that is succeeding.

## Actual
Immediately after the 6th digit the modal contains, verbatim:
```
Error:
Still waiting for your wallet
Your wallet still hasn't responded. Starting over asks for a new connection and discards any request already open in your wallet.
Start over
```
alongside `Success!` (and "Didn't get an email? Resend code"). On the next render the header
switches to the signed-in wallet pill `0x4C31…6349` and the error disappears (≈0–1 s; on the first
sign-in we observed it during "Creating your wallet. Please wait…" for a few seconds). The first
occurrence read `Error : Still waiting for your wallet. … Start over — Creating your wallet. Please wait...`.

## Evidence
- Observed twice on 2026-10-28 (≈10:20 UTC on the first-ever login of the account, and ≈10:50 UTC
  on a fresh sign-in), both at https://app.testnet.dreamdex.io (first on
  `/trade/spot/tokyo/STT:USDso`, second on `/competition`). Both times the login completed and
  landed Wallet 1 `0x4C31db174698Be4a0aE2E643243307457c846349`.
- Header after the code (verbatim): `Testnet / Trade / Events / Portfolio / Perps Arena / Lend / dreamBot / Support / Deposit / 0x4C31…6349`.
- Screenshots were taken in our test browser; the text above is copied from the page DOM.

## Environment
- App: https://app.testnet.dreamdex.io (Privy e-mail login), desktop Chromium
- Network: Somnia Tokyo testnet (DreamDEX region)
- Wallet: app Wallet 1 `0x4C31db174698Be4a0aE2E643243307457c846349`
