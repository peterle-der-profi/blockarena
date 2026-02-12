# ⚡ BlockArena

Real-time prediction game on MegaETH (10ms block times).

Players predict price direction (UP/DOWN) each tick using commit-reveal, and top scorers split the pot.

## Structure

- `/contracts` — Foundry project with `ArenaEngine.sol`
- `/frontend` — Next.js app with wagmi/viem

## Smart Contract

```bash
cd contracts
forge build    # Compile
forge test -vv # Run tests

# Deploy to MegaETH testnet
forge script script/Deploy.s.sol \
  --rpc-url megaeth_testnet \
  --broadcast --skip-simulation --gas-limit 5000000 \
  --interactives 1
```

## Frontend

```bash
cd frontend
npm run dev    # Dev server
npm run build  # Production build
```

Set the deployed contract address in `lib/contract.ts`.

## Config

| Network  | Chain ID | RPC |
|----------|----------|-----|
| Testnet  | 6343     | https://carrot.megaeth.com/rpc |
| Mainnet  | 4326     | https://mainnet.megaeth.com/rpc |
