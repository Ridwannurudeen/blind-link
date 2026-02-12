import { useMemo } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { PROGRAM_ID } from "../config";
import idl from "../idl/blind_link.json";

/**
 * Returns the Anchor Program instance for blind_link,
 * or null if wallet is not connected.
 */
export function useProgram(): anchor.Program | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // Anchor 0.30+ uses IDL with embedded address
    const fullIdl = { ...idl, address: PROGRAM_ID } as unknown as anchor.Idl;

    return new anchor.Program(fullIdl, provider);
  }, [connection, wallet]);
}
