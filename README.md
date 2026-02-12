# ⚡ BlockArena

**The First 100 FPS Blockchain Game** — Real-time prediction game on MegaETH (10ms block times).

Players predict price direction (UP/DOWN) every tick in 15-second arenas. Top scorers split the pot. Commit-reveal mechanics ensure fair play.

## Architecture

```
contracts/     — Solidity (Foundry) — Diamond proxy + ArenaEngine
frontend/      — Next.js 14 — Mobile-first UI, Privy wallets, MegaETH instant txs
backend/       — Express + WebSocket — Oracle relay, arena management, indexing
```

## Features

- **⚡ 10ms blocks** — MegaETH real-time price tracking
- **🔒 Commit-reveal** — Tamper-proof predictions with bit-packed uint256[] tapes
- **💎 Diamond proxy** — Upgradeable modular contracts (EIP-2535)
- **🏆 Arena tiers** — Bronze/Silver/Gold/Diamond with different stakes
- **🔥 God Streak** — Multipliers for consecutive wins
- **👥 Referrals** — On-chain referral tracking with fee splits
- **🎨 Highlight NFTs** — On-chain SVG minted for top scores
- **🏟️ Tournaments** — Multi-round bracket tournaments
- **📱 Mobile-first** — Privy embedded wallets, no popups, instant signing
- **⚡ eth_sendRawTransactionSync** — EIP-7966 instant receipts on MegaETH

## Smart Contracts

```bash
cd contracts
forge build       # Compile
forge test -vv    # Run tests (91 tests)
```

### Key Libraries
- `BitPack.sol` — SWAR popcount, 1-bit/2-bit packed access
- `Scoring.sol` — XOR + popcount scoring (~6 iterations for 1500 ticks)
- `StreakLib.sol` — Streak multiplier calculations

### Deploy
```bash
forge script script/DeployDiamond.s.sol \
  --rpc-url megaeth_testnet \
  --broadcast --skip-simulation
```

## Frontend

```bash
cd frontend
cp .env.example .env.local  # Set NEXT_PUBLIC_PRIVY_APP_ID etc.
npm install
npm run dev                  # Dev server on :3000
npm run build                # Production build
```

## Backend

```bash
cd backend
cp .env.example .env         # Set RPC_URL, PRIVATE_KEY etc.
npm install
npm run build                # Compile TypeScript
npm start                    # Start server
```

## Network Config

| Network  | Chain ID | RPC |
|----------|----------|-----|
| Testnet  | 6343     | `https://carrot.megaeth.com/rpc` |
| Mainnet  | 4326     | `https://mainnet.megaeth.com/rpc` |

Explorer: `https://megaeth-testnet-v2.blockscout.com`

## Tech Stack

- **Oracle**: RedStone Bolt (price push every MegaETH block)
- **Wallets**: Privy embedded wallets with wagmi fallback
- **Indexing**: Event-based (Envio HyperIndex planned)
- **Contracts**: Solidity 0.8.28, Diamond proxy (EIP-2535), Foundry

## License

MIT
