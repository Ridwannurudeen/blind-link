# Blind-Link

**Private contact discovery on Arcium. Find who you know without revealing who you know.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Try_Now-blue?style=for-the-badge)](https://arcium-blind-link.vercel.app)
[![Video Demo](https://img.shields.io/badge/Video_Demo-Watch_on_Loom-purple?style=for-the-badge)](https://www.loom.com/share/8ca7302dc3d7478abde4ee873130c424)
[![Built on Arcium](https://img.shields.io/badge/Built_on-Arcium_MXE-green?style=for-the-badge)](https://arcium.com)

> No wallet required — try the demo mode instantly.

[![Blind-Link Demo](https://cdn.loom.com/sessions/thumbnails/8ca7302dc3d7478abde4ee873130c424-with-play.gif)](https://www.loom.com/share/8ca7302dc3d7478abde4ee873130c424)

---

## The Problem

Every social app asks the same question during onboarding: *"Can we access your contacts?"*

Behind that prompt, your entire address book gets uploaded to a central server in plaintext. The server learns your social graph regardless of whether your contacts are users.

**Why this matters in crypto:**
- Contact data is the primary vector for social engineering and SIM-swap attacks
- Privacy-conscious users abandon onboarding when asked for contacts
- Once uploaded, address books become permanent surveillance assets — even for non-users

## The Solution

Blind-Link implements **Delegated Private Set Intersection (PSI)** — a cryptographic protocol where contacts are compared against a global user registry *without either party seeing the other's data*.

```
┌─────────────┐        Encrypted        ┌──────────────────┐
│   Client     │──────────────────────────│  Privacy Network │
│              │   Rescue-cipher u128s   │                  │
│ Address Book │                         │  Global Registry │
│ (local only) │◄─────────────────────────│  (secret-shared) │
│              │   Match flags only      │                  │
└─────────────┘                          └──────────────────┘
         │                                       │
         │  SHA-256 + salt                       │  Cerberus MPC
         │  client-side                          │  N-1 dishonest
         ▼                                       ▼
   Never leaves device                   No node sees plaintext
```

**What's revealed:** Only binary match flags (yes/no for each contact).
**What's hidden:** All non-matching contacts, the registry contents, which specific entries matched (from the registry's perspective), and the intersection size (from the server's perspective).

## Why Arcium?

| Approach | Limitation | Blind-Link with Arcium |
|---|---|---|
| **Trusted server** | Server sees all contacts in plaintext | No server ever sees plaintext |
| **ZK proofs** | Proves *about* data, can't compute *on* private data from two parties | Full two-party PSI with encrypted inputs from both sides |
| **TEEs (SGX/TDX)** | Hardware trust assumption; side-channel vulnerabilities | Cryptographic security — no hardware trust needed |
| **Homomorphic Encryption** | Single-key; one party must decrypt | Multi-party computation with secret sharing across nodes |

Arcium's MXE provides **dishonest-majority MPC** — security holds even if all-but-one Arx nodes are compromised. Combined with the Rescue cipher and Cerberus protocol, this gives information-theoretic security with no computational assumptions on the secret shares.

## Features

- **Demo-first** — Try the full discovery flow without a wallet. Demo mode uses real SHA-256 hash matching locally
- **Smart contact parsing** — Auto-detects emails, phone numbers, and handles with type badges and normalization preview
- **Privacy fog animation** — Visual metaphor showing your data being encrypted, with a split-screen "What You See" vs "What the Network Sees"
- **On-chain session history** — Every discovery is recorded as a verifiable computation proof on Solana
- **Plain English errors** — No jargon. "Privacy network is offline" instead of "MXE public key not found"
- **Light & dark themes** — Persisted across sessions
- **Code-split bundle** — Initial page load ~86 KB gzipped

## Privacy Guarantees

| Party | Sees | Does NOT See |
|---|---|---|
| **Your Browser** | Contacts before hashing | Nothing sent unencrypted |
| **Privacy Node 1** | Share₁ only | Can't reconstruct data |
| **Privacy Node 2** | Share₂ only | Can't reconstruct data |
| **Privacy Node 3** | Share₃ only | Can't reconstruct data |
| **On-Chain** | Encrypted ciphertexts | Zero plaintext ever |

## How It Works

```
Step 1: Local Hash           Step 2: Private Compute       Step 3: Result Reveal
┌─────────────────┐         ┌─────────────────────┐       ┌──────────────────┐
│ SHA-256(salt ‖   │         │ x25519 key exchange │       │ Decrypt match    │
│  contact)        │────────▶│ Rescue cipher enc   │──────▶│ flags locally    │
│ → u128 hashes    │         │ MXE PSI execution   │       │ Show matched     │
│                  │         │ On-chain callback   │       │ contacts only    │
└─────────────────┘         └─────────────────────┘       └──────────────────┘
     Client-side               Privacy network               Client-side
```

1. **Client hashes contacts locally** — SHA-256 truncated to u128 (fits Curve25519 scalar field). Raw contacts never leave the browser.
2. **Encrypted computation on Arcium MXE** — Hashes are encrypted via x25519 ECDH + Rescue cipher and sent to the MPC cluster. Cerberus protocol distributes secret shares across Arx nodes.
3. **Match flags returned** — Only binary yes/no results are decrypted client-side. The registry learns nothing about non-matching contacts.

## Security Model

| Property | Mechanism |
|---|---|
| **Input privacy** | x25519 ECDH → Rescue cipher (128-bit security, CTR mode) |
| **Computation privacy** | Cerberus MPC with MAC-authenticated shares |
| **Dishonest majority** | Security holds with N-1 malicious Arx nodes (only 1 honest required) |
| **No data exfiltration** | Secret shares are information-theoretically secure |
| **Forward secrecy** | Per-session ephemeral x25519 keys |

### Threat Model

- **Malicious client:** Can only learn their own match results (by design)
- **Malicious server:** Sees only ciphertexts; cannot decrypt without MXE cluster cooperation
- **Compromised Arx nodes:** Cerberus tolerates all-but-one dishonest nodes
- **Blockchain surveillance:** On-chain data is Rescue-encrypted; no plaintext ever touches Solana

## Performance

| Metric | Value | Notes |
|---|---|---|
| Initial page load | ~86 KB gzipped | Code-split with lazy-loaded pages |
| MXE computation | ~15s | Depends on cluster size and network latency |
| On-chain tx cost | ~0.002 SOL | Queue + callback transactions |
| Registry capacity | 64 users (4 × 16) | Bucket full → registration fails gracefully |
| Max contacts/query | 16 | `MAX_CLIENT_CONTACTS` constant in circuit |

## Architecture

### Arcis Circuit (`encrypted-ixs/src/lib.rs`)

The MXE circuit implements bucketed PSI with constant-time execution:

- **Bucketed fingerprint matching** — Contact hashes mapped to `NUM_BUCKETS=4` buckets via modular reduction. All buckets scanned with constant-time guards (MPC cannot branch on secret bucket indices)
- **Constant-time execution** — Match and non-match branches execute identically, preventing timing side-channels
- **Capacity protection** — `register_user` checks bucket capacity before insertion; full buckets fail without corrupting counters

| Instruction | Purpose | Complexity |
|---|---|---|
| `intersect_contacts` | PSI between client contacts and registry | O(n × NUM_BUCKETS × BUCKET_SIZE) where n ≤ 16 |
| `register_user` | Insert a user hash into the registry | O(NUM_BUCKETS × BUCKET_SIZE) |
| `reveal_registry_size` | Public count of registered users | O(1) |

### Solana Program (`programs/blind_link/src/lib.rs`)

Anchor program managing the MXE session lifecycle:

- **Init → Queue → Callback** — Standard Arcium computation pattern with `SignedComputationOutputs<T>` proof verification
- **`PsiSession` PDA** — Per-user session tracking with encrypted result storage and status (pending → computing → completed/failed)
- **`RegistryState` PDA** — Global registry holding MXE-encrypted bucket data (4 buckets × 16 slots)
- **Events** — `PsiCompleteEvent`, `UserRegisteredEvent`, `RegistrySizeEvent` emitted on callbacks

### React Frontend (`app/src/`)

| Component | File | Role |
|---|---|---|
| Landing | `pages/Landing.tsx` | Hero, benefit badges, collapsible tech specs, demo-first CTA |
| Register | `pages/Register.tsx` | User registration with privacy loader and demo mode fallback |
| Discovery | `pages/Discovery.tsx` | Contact input, PSI execution, post-discovery CTAs |
| How It Works | `pages/HowItWorks.tsx` | Animated 5-stage flow visualization with privacy scorecard |
| History | `pages/History.tsx` | On-chain session history with Solana Explorer links |

## Quick Start

### Prerequisites

- [Arcium CLI](https://docs.arcium.com/developers/hello-world)
- Solana CLI (`solana config set --url devnet`)
- Node.js 18+, Rust

### Build & Deploy

```bash
git clone https://github.com/Ridwannurudeen/blind-link.git
cd blind-link && npm install

# Build circuits + Anchor program
arcium build

# Run tests on devnet
arcium test --cluster devnet

# Deploy to devnet
arcium deploy \
  --cluster-offset 456 \
  --recovery-set-size 4 \
  --keypair-path ~/.config/solana/id.json \
  --rpc-url https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Run the Frontend

```bash
cd app && npm install && npm run dev
```

**Configuration:**
1. Copy `app/.env.example` to `app/.env`
2. Update `VITE_PROGRAM_ID` with your deployed program ID (from `declare_id!()` in `programs/blind_link/src/lib.rs`)
3. Optionally update `VITE_SOLANA_RPC` with your preferred RPC endpoint

## Project Structure

```
blind-link/
├── encrypted-ixs/src/
│   └── lib.rs                        # Arcis MXE circuit (PSI + register + reveal)
├── programs/blind_link/src/
│   └── lib.rs                        # Anchor program (session lifecycle + proof verification)
├── app/src/
│   ├── pages/                        # Landing, Register, Discovery, HowItWorks, History
│   ├── components/                   # BlindOnboarding, ContactInput, Navbar, WalletButton
│   ├── services/blind-link-client.ts # PSI client with demo mode fallback
│   ├── hooks/useProgram.ts           # Anchor provider + program init
│   └── config.ts                     # Program ID + cluster config
├── tests/
│   └── blind_link.ts                 # Integration test suite (devnet)
├── Arcium.toml                       # Arcium project config
├── Anchor.toml                       # Anchor config
└── package.json
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Circuit** | Arcis (Rust) on Arcium MXE |
| **Smart Contract** | Anchor (Solana) |
| **Frontend** | React + TypeScript + Vite |
| **Styling** | Plain CSS with CSS custom properties (light/dark themes) |
| **Cryptography** | Cerberus MPC, Rescue cipher, SHA-256, x25519 ECDH |
| **Deployment** | Vercel (frontend), Solana Devnet (on-chain) |

## Use Cases

The Delegated PSI pattern generalizes beyond contact discovery:

- **Social onboarding** — Find friends without uploading your address book
- **Dating apps** — Discover mutual interest without revealing unmatched preferences
- **Professional networking** — Match skills to opportunities without public profiles
- **Marketplace matching** — Connect buyers and sellers without exposing either party's full catalog

## Roadmap

- [ ] ORAM-backed oblivious access for `NUM_BUCKETS`x reduction in comparison rounds
- [ ] Bucket/shard expansion for larger registries (10K+ users)
- [ ] Batch registration for bulk onboarding
- [ ] Mobile SDK (React Native)
- [ ] Mainnet deployment with production Arx cluster
- [ ] SDK for third-party apps to integrate private contact discovery

## License

MIT
