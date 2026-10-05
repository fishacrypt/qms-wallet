# QMS Wallet

A lightweight, self-custody browser wallet for the QMS Testnet.

## Features

- Create a new wallet with a recovery phrase
- Import a recovery phrase or private key
- Encrypt wallet data locally with AES-256-GCM
- Protect encryption with PBKDF2-SHA256
- Automatic wallet locking after inactivity
- View QMS Testnet balance
- Send and receive QMS
- Generate a QR code for receiving funds
- View transaction activity
- Estimate transaction fees before sending
- Connect directly to the QMS Testnet RPC
- No backend server or database required

## QMS Testnet

| Setting | Value |
| --- | --- |
| Network | QMS Testnet |
| Chain ID | 19480 |
| RPC | https://rpc.testnet.qms.finance |
| Symbol | QMS |
| Explorer | https://testnet.qmsscan.io |
| Faucet | https://faucet.testnet.qms.finance |

## How It Works

The wallet runs entirely in the browser.

Private wallet information is encrypted and stored locally in the browser. Transactions are signed locally before being submitted to the QMS Testnet RPC.

The current version does not send private keys or recovery phrases to a server.

## Getting Started

### 1. Download the project

Clone the repository or download the project files.

### 2. Use index.html

Rename the wallet file to:

```text
index.html
```

The file should be at the root of the project.

### 3. Run locally

Open `index.html` in a modern browser.

For development, you can also serve the folder with a local web server.

### 4. Deploy

The wallet is a static web application, so it can be deployed using services such as:

- Cloudflare Pages
- Vercel
- GitHub Pages
- Any static web hosting provider

No backend server is required for the current testnet version.

## Security

This wallet is self-custody. Users are responsible for protecting their recovery phrase and private keys.

Important security practices:

- Never share a recovery phrase or private key
- Never store recovery phrases in screenshots or public posts
- Use a strong wallet password
- Always verify the website address before entering wallet information
- Verify transaction addresses and amounts before signing
- Keep the wallet software and dependencies up to date

## Important Testnet Notice

This version is configured for the QMS Testnet.

Do not use it as a mainnet wallet until the network configuration, dependencies, transaction handling, security controls, and code have been properly audited and verified.

Testnet assets may have no real-world value.

## Dependencies

The current wallet uses:

- ethers.js 5.7.2
- qrcode-generator 1.4.4
- Google Fonts

For a production wallet, external JavaScript dependencies should preferably be bundled or self-hosted and pinned to verified versions.

## Development

The wallet is implemented as a single HTML file containing the interface, styles, and JavaScript logic.

The main areas of the application are:

- Wallet creation
- Wallet import
- Local encryption
- Wallet locking
- Balance and network checks
- Transaction preparation
- Transaction signing
- Transaction activity
- Recovery phrase management

## Roadmap

Possible future improvements include:

- Bundle and self-host all JavaScript dependencies
- Strengthen the Content Security Policy
- Add automated security testing
- Add transaction history from the QMS explorer
- Add token support
- Add address book functionality
- Add PWA support
- Add hardware wallet support
- Support QMS mainnet after proper verification and security review

## Disclaimer

This project is provided for testing and development purposes.

Use it at your own risk. Always back up your recovery phrase securely before using the wallet.

