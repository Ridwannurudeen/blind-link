# Blind-Link

**Private contact discovery on Arcium. Find who you know without revealing who you know.**

Blind-Link is a Private Set Intersection (PSI) application built on the [Arcium](https://arcium.com) Multiparty Execution Environment (MXE). It lets users discover mutual contacts without either party exposing their address book — solving the #1 privacy barrier in Web3 social onboarding.

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
│   Client     │──────────────────────────│   Arcium MXE     │
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

## Architecture

### 1. Arcis Circuit (`encrypted-ixs/src/lib.rs`)

The MXE circuit implements bucketed PSI with constant-time execution:

- **Bucketed fingerprint matching** — Contact hashes are mapped to `NUM_BUCKETS` (4) buckets via modular reduction. All buckets are scanned with constant-time guards since MPC cannot branch on secret bucket indices. ORAM integration would reduce per-contact comparisons by `NUM_BUCKETS`x
- **Constant-time execution** — Match and non-match branches execute identically, preventing timing side-channels at the MPC level. The arcis compiler converts all conditionals to constant-time select operations
- **`Enc<Shared, ClientContacts>`** — Salted SHA-256 truncated to u128, fitting within the Curve25519 scalar field
- **`Enc<Mxe, GlobalRegistry>`** — Registry persists as MXE-encrypted shared private state; no single Arx node can read it

| Instruction | Purpose | Complexity |
|---|---|---|
| `intersect_contacts` | PSI between client contacts and registry | O(n × NUM_BUCKETS × BUCKET_SIZE) |
| `register_user` | Insert a user hash into the registry | O(NUM_BUCKETS × BUCKET_SIZE) |
| `reveal_registry_size` | Public count of registered users | O(1) |

### 2. Solana Program (`programs/blind_link/src/lib.rs`)

Anchor program managing the MXE session lifecycle:

- **Init → Queue → Callback** — Standard Arcium computation pattern with `SignedComputationOutputs<T>` proof verification against the cluster account
- **`PsiSession` PDA** — Per-user session tracking with encrypted result storage and status (pending → computing → completed/failed)
- **`RegistryState` PDA** — Global registry holding MXE-encrypted bucket data, seeded with `b"blind_link_registry"`
- **Events** — `PsiCompleteEvent`, `UserRegisteredEvent`, `RegistrySizeEvent` emitted on each callback for client indexing

### 3. React Frontend (`app/src/`)

| Component | File | Role |
|---|---|---|
| Register | `pages/Register.tsx` | User registration flow with wallet connection |
| Discovery | `pages/Discovery.tsx` | Contact input and PSI result display |
| Contact Input | `components/ContactInput.tsx` | Contact list entry with validation |
| Program Hook | `hooks/useProgram.ts` | Anchor program initialization via `@arcium-hq/client` |

**Onboarding Flow:**

```
Step 1: Local Hash           Step 2: Arcium Compute        Step 3: Result Reveal
┌─────────────────┐         ┌─────────────────────┐       ┌──────────────────┐
│ SHA-256(salt ‖   │         │ x25519 key exchange │       │ Decrypt match    │
│  contact)        │────────▶│ Rescue cipher enc   │──────▶│ flags locally    │
│ → u128 hashes    │         │ MXE PSI execution   │       │ Show matched     │
│                  │         │ On-chain callback   │       │ contacts only    │
└─────────────────┘         └─────────────────────┘       └──────────────────┘
     Client-side                Arcium network               Client-side
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
| **Anti-rainbow-table** | Per-session random salt; same contact → different hash each time |

### What Each Party Learns

| Party | Learns | Does NOT learn |
|---|---|---|
| **Client** | Which contacts are registered | Registry contents, non-matching users |
| **App server** | That a PSI was requested | Any contact hashes, match results, intersection size |
| **Arx nodes** | Nothing (secret shares only) | Any plaintext data from either party |
| **On-chain observers** | Encrypted ciphertexts, tx metadata | Any plaintext contact or match data |

### Threat Model

- **Malicious client:** Can only learn their own match results (by design)
- **Malicious server:** Sees only ciphertexts; cannot decrypt without MXE cluster cooperation
- **Compromised Arx nodes:** Cerberus tolerates all-but-one dishonest nodes
- **Blockchain surveillance:** On-chain data is Rescue-encrypted; no plaintext ever touches Solana

## Performance

| Metric | Value | Notes |
|---|---|---|
| MXE computation | ~15s | Depends on cluster size and network latency |
| On-chain tx cost | ~0.002 SOL | Queue + callback transactions |
| Registry capacity | 64 users (4 × 16) | Scales via bucket/shard expansion |
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

Configure `app/.env` with your program ID and RPC endpoint (see `app/.env.example`).

## Project Structure

```
blind-link/
├── encrypted-ixs/src/
│   └── lib.rs                        # Arcis MXE circuit (PSI + register + reveal)
├── programs/blind_link/src/
│   └── lib.rs                        # Anchor program (session lifecycle + proof verification)
├── app/src/
│   ├── pages/                        # Landing, Register, Discovery pages
│   ├── components/                   # ContactInput, Navbar, WalletButton
│   ├── hooks/useProgram.ts           # Anchor provider + program init
│   └── config.ts                     # Program ID + cluster config
├── tests/
│   └── blind_link.ts                 # Integration test suite (devnet)
├── Arcium.toml                       # Arcium project config
├── Anchor.toml                       # Anchor config
└── package.json
```

## Arcium Primitives Used

| Primitive | Usage |
|---|---|
| **`Enc<Shared, T>`** | Client contact hashes — encrypted with Rescue cipher, split into secret shares across Arx nodes |
| **`Enc<Mxe, T>`** | Global Registry — persists as MXE-encrypted state on Solana, never exists in plaintext |
| **Cerberus MPC** | Dishonest majority model — secure with N-1 malicious nodes (only 1 honest required) |
| **`SignedComputationOutputs`** | Proof verification in each callback against the cluster account |
| **Constant-time guards** | All bucket scans compiled to MPC selects — no secret-dependent branching |

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
