# QPouch – Community Wallet for QMS Testnet

**Version 0.2.0**

QPouch is a self-custody browser wallet for the **QMS Testnet**. It lets you hold testnet QMS, send and receive it, and connect to QMS Testnet websites (swaps, liquidity, contract deployment tools and more).

> **Unofficial.** QPouch is built by a community member. It is not made, endorsed or operated by QMS Network.
> **Testnet only.** It has not been independently audited. Do not use it with real funds or with a wallet that holds real assets.

---

## Features

- Create a wallet with a 12-word recovery phrase (with a backup check), or import a phrase or private key
- Send and receive testnet QMS, with a fee preview and full-address review before you confirm
- Connects to dApps through the standard injected-wallet interfaces (EIP-1193 and EIP-6963)
- Sign messages and typed data, and approve transactions, after reviewing the site and request
- Encrypted on your device. No servers, analytics or tracking
- Unlock once; the wallet locks after 1 hour of inactivity or when you close the browser

## Network

| Setting | Value |
| --- | --- |
| Network | QMS Testnet |
| Chain ID | 19480 (0x4C18) |
| RPC | https://rpc.testnet.qms.finance |
| Explorer | https://testnet.qmsscan.io |
| Faucet | https://faucet.testnet.qms.finance |
| Currency | QMS |

QPouch supports this network only. Requests to switch to or add any other chain are refused. Confirm these values against the official docs at https://docs.qms.finance.

## Requirements

- A desktop Chromium browser: Chrome, Edge or Brave, version 111 or newer
- Regular Chrome on Android does not support extensions. Kiwi Browser does

## Install (developer mode)

1. **Download this folder** and unzip it. You should see `manifest.json`, `popup.html`, `background.js` and other files together in one folder. If you only see another folder inside, open it.
2. **Add the crypto library.** The folder must contain `ethers.umd.min.js` (ethers.js **5.7.2**). In PowerShell, from this folder:
   ```powershell
   Invoke-WebRequest https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js -OutFile ethers.umd.min.js
   ```
   Optional integrity check: run `Get-FileHash -Algorithm SHA384 ethers.umd.min.js` and compare it with the SRI hash listed for ethers 5.7.2 on cdnjs.com.
3. Open `chrome://extensions` and turn on **Developer mode**.
4. Click **Load unpacked** and select the folder that contains `manifest.json`.
5. Pin QPouch from the puzzle-piece icon in the toolbar.

To update later, replace the files, then click the reload arrow on the extension's card. Your wallet is kept, because it is stored in the extension's data.

## Getting started

1. Click the QPouch icon and choose **Create a new wallet** (or **Import existing wallet**).
2. Set a password: at least 12 characters, with at least 3 of lowercase, uppercase, digits and symbols. **It cannot be recovered.**
3. Write your 12-word recovery phrase on paper and confirm 3 words. Never store it in screenshots, chats or cloud notes.
4. Copy your address from the home screen and request test QMS from the faucet.
5. Use **Send** and **Receive** from the home screen. Check the explorer for your transactions.

## Connecting to a website

1. On the dApp, choose **QPouch** or the generic **Browser wallet / Injected** option in its Connect Wallet menu.
2. An approval window opens showing the site's address. Review it and click **Connect**.
3. When the site asks you to sign or send something, a window shows the details and any warnings. Approve or reject.
4. Manage or remove connections under **Security → Connected sites**.

If a site doesn't see the wallet, reload the page after installing or updating the extension.

## Locking and passwords

- You enter your password once to unlock. After that, sends and approvals don't ask again.
- The wallet locks after **1 hour of inactivity**, when you click **Lock now**, or when the browser closes.
- Revealing your recovery phrase **always** asks for your password.
- After 5 wrong password attempts, further attempts are delayed (30 seconds, doubling each time).

## What websites can and cannot do

Supported requests: `eth_requestAccounts`, `eth_accounts`, `eth_chainId`, `net_version`, `personal_sign`, `eth_signTypedData_v4`, `eth_sendTransaction`, `wallet_switchEthereumChain` and `wallet_addEthereumChain` (QMS Testnet only), and read calls (balances, blocks, contract calls) forwarded to the QMS RPC.

Not supported on purpose: `eth_sign` and other blind-signing methods, other chains, and any request from a non-HTTPS site (localhost is allowed for development).

Approval warnings cover unlimited token approvals, NFT collection-wide access, permit and order-style signatures, contract interactions, and requests meant for the wrong chain. Signatures meant for another chain are blocked.

## Security model

- Wallets are encrypted at rest with AES-256-GCM, using a key derived from your password with PBKDF2-SHA256 (600,000 iterations) and random salt and IV.
- Your keys and password never leave your device.
- After unlocking, the decrypted secret is held in temporary browser memory only (`chrome.storage.session`), never written to disk, and wiped after 1 hour idle or at browser close.
- The extension may connect only to the QMS Testnet RPC, enforced by its content security policy. No remote scripts or remotely hosted code are used.
- The origin of each request is taken from the browser, not from page data. Each site can have one pending request, with a maximum of 3 in total.

See `SECURITY.md` in the store kit for the full notes and known limitations.

## Permissions explained

| Permission | Why |
| --- | --- |
| `storage` | Keeps your encrypted wallet, connected sites and the temporary unlocked session on your device |
| `alarms` | Wipes the unlocked session after 1 hour of inactivity |
| Scripts on http/https pages | Lets websites find the wallet (`window.ethereum` and EIP-6963) so they can request a connection. QPouch doesn't read or change page content |

## Privacy

QPouch collects no personal data and has no servers or analytics. The only network connection is to the QMS Testnet RPC, which sees your public address and the transactions you send, like any blockchain node. Websites you connect to see your public address after you approve. Full policy: `PRIVACY-POLICY.md`.

## Known limitations

- Testnet only, and not independently audited
- While unlocked, anyone using your open browser can sign. Lock the wallet when you step away
- No token list or NFT view yet; the home screen shows native QMS only
- Activity shows transactions sent from this wallet only
- No hardware-wallet support
- Account and network change events are not pushed to sites; reload the page after disconnecting
- No post-quantum signatures yet. QMS's execution layer uses standard Ethereum signatures; post-quantum protection arrives through smart accounts, which QPouch does not support yet

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Chrome says "Manifest file is missing or unreadable" | You selected the wrong folder. Select the one that directly contains `manifest.json` |
| Popup says the crypto library is missing or the wrong version | Add `ethers.umd.min.js` version 5.7.2 to the folder, then reload the extension |
| A site doesn't offer QPouch | Reload the site. Try the generic "Browser wallet / Injected" option. If another wallet is installed, it may take priority; disable it for testing |
| "QPouch connects to HTTPS sites only" | The site uses plain http. Only https and localhost are allowed |
| "A request from this site is already pending" | Close the open approval window and try again |
| Send is disabled and shows a chain warning | The RPC reported a different chain ID. Check your connection and the network values |
| "Too many attempts" | Wait for the countdown shown, then try again |
| Transaction fails during fee estimation | The recipient or contract may reject it, or you lack balance for amount plus fee. Check the explorer |

## Project layout

```
manifest.json     Extension manifest (Manifest V3)
popup.html/js/css Wallet interface and approval windows
background.js     Request handling, approvals, RPC access, idle wipe
content.js        Bridge between pages and the extension
inpage.js         Injects the wallet provider into pages
icons/            Extension icons
ethers.umd.min.js ethers.js 5.7.2 (add this yourself; see Install)
```

## Reporting issues

Please report bugs and security concerns to: [your email or GitHub issues link]. For security issues, avoid posting details publicly until they're fixed.

## License

[Choose a license, e.g. MIT, and add a LICENSE file.] Includes ethers.js (MIT License).

## Disclaimer

QPouch is provided as is, without warranty. It is experimental software for testing. You are responsible for your keys, recovery phrase and any transactions you approve. QMS and related names and logos belong to their owners and are referenced only to describe compatibility.
