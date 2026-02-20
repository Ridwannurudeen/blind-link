# Blind-Link — Hackathon Submission

## One-liner
Private contact discovery on Arcium MXE — find who you know without revealing who you know.

## Links
- **Live Demo**: https://app-six-xi-40.vercel.app
- **Source Code**: https://github.com/Ridwannurudeen/blind-link
- **Program (Devnet)**: `88vVM7s7TKCPeJ8DNHnctTTTWFWwSmSDAxnuTRjuzTyn`

## Problem
Every social app asks "Can we access your contacts?" — and uploads your entire address book in plaintext. In crypto, this is a prime vector for social engineering and SIM-swap attacks. Privacy-conscious users abandon onboarding entirely.

## Solution
Blind-Link implements **Delegated Private Set Intersection (PSI)** on Arcium's MXE. Users discover mutual contacts without either party seeing the other's data:

1. **Client hashes contacts locally** (SHA-256 → u128, never leaves the device)
2. **Arcium MXE computes the intersection** via Cerberus MPC — no single Arx node sees plaintext
3. **Only binary match flags are returned** — non-matching contacts remain hidden

## Architecture

| Layer | Technology | Purpose |
|---|---|---|
| Circuit | Arcis (Rust → MPC) | 4 instructions: `init_registry`, `register_user`, `intersect_contacts`, `reveal_registry_size` |
| On-chain | Solana Anchor | Session lifecycle, PDA state management, MXE callback verification |
| Frontend | React + Vite | Animated MPC flow, smart contact input, session history, wallet integration |
| Crypto | Rescue cipher, x25519 ECDH | Per-session encryption, dishonest-majority MPC (N-1 tolerance) |

## Arcium Primitives Used
- **`Enc<Shared, ClientContacts>`** — Client contact hashes encrypted with Rescue cipher, secret-shared across Arx nodes
- **`Enc<Mxe, GlobalRegistry>`** — Registry persists as MXE-encrypted state on Solana; never exists in plaintext
- **Cerberus MPC** — Dishonest majority security (secure with N-1 malicious nodes)
- **`SignedComputationOutputs`** — Proof verification in callbacks against the cluster account
- **Constant-time MPC guards** — All bucket scans compiled to MPC selects, no secret-dependent branching

## Security Model

| Party | Learns | Does NOT Learn |
|---|---|---|
| **Client** | Which contacts are registered | Registry contents, non-matching users |
| **App server** | That a PSI was requested | Contact hashes, match results |
| **Arx nodes** | Nothing (secret shares only) | Any plaintext from either party |
| **On-chain observers** | Encrypted ciphertexts | Any plaintext contact or match data |

## Technical Highlights
- **Bucketed fingerprint matching** — O(n x NUM_BUCKETS x BUCKET_SIZE) constant-time circuit execution
- **Capacity overflow protection** — Registry checks bucket capacity before insertion; counters only increment on success
- **Demo mode fallback** — Auto-detects MXE cluster availability; runs real local PSI with SHA-256 hash matching when MXE is offline
- **Web Worker hashing** — Non-blocking SHA-256 computation keeps UI responsive during contact processing

## Demo Instructions
1. Visit https://app-six-xi-40.vercel.app
2. Connect a Solana wallet (Phantom, Solflare, etc.)
3. **How It Works** — Click "How It Works" in the nav to see the animated 5-stage MPC flow with privacy scorecard
4. **Register** — Register a contact identifier (auto-detects MXE, falls back to demo mode)
5. **Discover** — Enter contacts (email, phone, @handle) — smart normalization auto-detects types, deduplicates, and shows badges. Click "Start Private Discovery" for PSI
6. **History** — View on-chain session records with Solana Explorer links
7. The app auto-detects MXE status — if the devnet cluster is online, it runs real MPC computation; otherwise, it demonstrates the full flow with local PSI simulation using identical SHA-256 hashing

## Build & Run Locally
```bash
git clone https://github.com/Ridwannurudeen/blind-link.git
cd blind-link && npm install
arcium build                    # Build circuits + Anchor program
arcium deploy --cluster-offset 456  # Deploy to devnet
cd app && npm install && npm run dev  # Start frontend
```

## What Makes This Superior
1. **Real cryptographic protocol** — Not a UI mock; actual PSI with SHA-256 hash intersection
2. **MXE-encrypted persistent state** — Global registry lives as `Enc<Mxe, GlobalRegistry>` on-chain
3. **Dishonest majority security** — Cerberus protocol tolerates N-1 malicious nodes
4. **Production-ready UX** — Animated How It Works explainer, smart contact normalization, on-chain session history, graceful MXE fallback
5. **Comprehensive security model** — Documented threat model with per-party analysis
6. **Animated MPC flow visualization** — 5-stage interactive demo (Hash → Encrypt → MXE Compute → Decrypt → Result) with privacy scorecard showing exactly what each party sees
7. **Smart contact input** — Auto-detects contact type (email, phone, handle), normalizes formats, deduplicates, shows type badges with color coding
8. **On-chain session history** — Queries PsiSession accounts via `getProgramAccounts`, links to Solana Explorer, shows verification proof info
9. **Full demo mode** — Both Register and Discovery pages auto-detect MXE availability and fall back to local SHA-256 PSI simulation

## Future Work
- ORAM-backed oblivious access for NUM_BUCKETS x reduction in comparisons
- Bucket/shard expansion for 10K+ user registries
- Batch registration for bulk onboarding
- Mobile SDK (React Native)
