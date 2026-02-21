# Blind-Link

**Private contact discovery on Arcium. Find who you know without revealing who you know.**

Blind-Link is a Private Set Intersection (PSI) application built on the [Arcium](https://arcium.com) Multiparty Execution Environment (MXE). It lets users discover mutual contacts without either party exposing their address book — solving the #1 privacy barrier in Web3 social onboarding.

**[Live Demo](https://app-six-xi-40.vercel.app)** — no wallet required, try the demo mode instantly.

**[Video Walkthrough](https://www.loom.com/share/8ca7302dc3d7478abde4ee873130c424)** — watch a full demo of Blind-Link in action.

---

## The Problem

Every social app asks the same question during onboarding: *"Can we access your contacts?"*

Behind that prompt, your entire address book gets uploaded to a central server in plaintext. The server learns your social graph regardless of whether your contacts are users.

**Why this matters in crypto:**
- Contact data is the primary vector for social engineering and SIM-swap attacks
- Privacy-conscious users abandon onboarding when asked for contacts
- Once uploaded, address books become permanent surveillance assets — even for non-users

## How It Works

Blind-Link implements **Delegated Private Set Intersection** — a cryptographic protocol where contacts are compared against a global user registry *without either party seeing the other's data*.

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

### Privacy Guarantees

| Party | Sees | Does NOT See |
|---|---|---|
| **Your Browser** | Contacts before hashing | Nothing sent unencrypted |
| **Privacy Node 1** | Share₁ only | Can't reconstruct data |
| **Privacy Node 2** | Share₂ only | Can't reconstruct data |
| **Privacy Node 3** | Share₃ only | Can't reconstruct data |
| **On-Chain** | Encrypted ciphertexts | Zero plaintext ever |

## Features

- **Demo-first** — Try the full discovery flow without a wallet. Demo mode uses real SHA-256 hash matching locally
- **Light & dark themes** — Clean light mode default with dark mode toggle, persisted across sessions
- **Privacy fog animation** — Visual metaphor showing your data being encrypted during computation, with a split-screen view of "What You See" vs "What the Network Sees"
- **Plain English errors** — No jargon. "Privacy network is offline" instead of "MXE public key not found"
- **Code-split bundle** — Lazy-loaded pages with vendor chunk splitting. Initial page load ~86 KB gzipped
- **Smart contact parsing** — Auto-detects emails, phone numbers, and handles with type badges and normalization preview
- **On-chain session history** — Every discovery is recorded as a verifiable computation proof on Solana

## Architecture

### 1. Arcis Circuit (`encrypted-ixs/src/lib.rs`)

The MXE circuit implements bucketed PSI with constant-time execution:

- **Bucketed fingerprint matching** — Contact hashes are mapped to `NUM_BUCKETS=4` buckets via modular reduction. All buckets are scanned with constant-time guards since MPC cannot branch on secret bucket indices
- **Constant-time execution** — Match and non-match branches execute identically, preventing timing side-channels at the MPC level
- **Deterministic hashing** — Same contact always hashes the same way. Privacy is enforced by Arcium MPC encryption and Rescue cipher, not hash randomization
- **`Enc<Shared, ClientContacts>`** — SHA-256 truncated to u128, fitting within the Curve25519 scalar field
- **`Enc<Mxe, GlobalRegistry>`** — Registry persists as MXE-encrypted shared private state; no single Arx node can read it
- **Capacity protection** — `register_user` checks bucket capacity before insertion; if full, insertion fails without corrupting counters

| Instruction | Purpose | Complexity |
|---|---|---|
| `intersect_contacts` | PSI between client contacts and registry | O(n × NUM_BUCKETS × BUCKET_SIZE) where n ≤ 16 |
| `register_user` | Insert a user hash into the registry | O(NUM_BUCKETS × BUCKET_SIZE) |
| `reveal_registry_size` | Public count of registered users | O(1) |

### 2. Solana Program (`programs/blind_link/src/lib.rs`)

Anchor program managing the MXE session lifecycle:

- **Init → Queue → Callback** — Standard Arcium computation pattern with `SignedComputationOutputs<T>` proof verification against the cluster account
- **`PsiSession` PDA** — Per-user session tracking with encrypted result storage and status (pending → computing → completed/failed)
- **`RegistryState` PDA** — Global registry holding MXE-encrypted bucket data (4 buckets × 16 slots), seeded with `b"blind_link_registry"`
- **Events** — `PsiCompleteEvent`, `UserRegisteredEvent`, `RegistrySizeEvent` emitted on callbacks

### 3. React Frontend (`app/src/`)

| Component | File | Role |
|---|---|---|
| Landing | `pages/Landing.tsx` | Hero, benefit badges, collapsible tech specs, demo-first CTA |
| Register | `pages/Register.tsx` | User registration with privacy loader and demo mode fallback |
| Discovery | `pages/Discovery.tsx` | Contact input, PSI execution, post-discovery CTAs |
| How It Works | `pages/HowItWorks.tsx` | Animated 5-stage flow visualization with privacy scorecard |
| History | `pages/History.tsx` | On-chain session history with Solana Explorer links |
| BlindOnboarding | `components/BlindOnboarding.tsx` | Privacy fog animation, split-screen view, progress tracking |
| Contact Input | `components/ContactInput.tsx` | Smart parsing with type detection and normalization |

**Onboarding Flow:**

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

## Security Model

### Cryptographic Guarantees

| Property | Mechanism |
|---|---|
| **Input privacy** | x25519 ECDH → Rescue cipher (128-bit security, CTR mode) |
| **Computation privacy** | Cerberus MPC with MAC-authenticated shares |
| **Dishonest majority** | Security holds with N-1 malicious Arx nodes (only 1 honest required) |
| **No data exfiltration** | Secret shares are information-theoretically secure — no computational assumption |
| **Forward secrecy** | Per-session ephemeral x25519 keys; compromise of one session doesn't affect others |
| **Matching correctness** | Deterministic hashing ensures registered users can be discovered |

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
| Registry capacity | 64 users max (4 × 16) | Bucket full → registration fails gracefully |
| Max contacts/query | 16 | `MAX_CLIENT_CONTACTS` constant in circuit |

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

## License

MIT
