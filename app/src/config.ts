// Program ID — updated after `arcium deploy` generates the real keypair.
// Set via VITE_PROGRAM_ID env var or fallback to placeholder.
export const PROGRAM_ID =
  import.meta.env.VITE_PROGRAM_ID || "9TVgatCVVvFtmEkHD1VqC1hW6Ddy3TaWN1vqhdqgZYq5";

export const SOLANA_RPC =
  import.meta.env.VITE_SOLANA_RPC || "https://api.devnet.solana.com";

export const SOLANA_NETWORK = "devnet" as const;
