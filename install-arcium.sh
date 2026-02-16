#!/bin/bash
set -e

echo "==== [1/7] Installing system dependencies ===="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl build-essential git pkg-config libssl-dev libudev-dev
echo "✓ Dependencies installed"

echo ""
echo "==== [2/7] Installing Rust ===="
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"
echo "✓ Rust installed: $(rustc --version)"

echo ""
echo "==== [3/7] Installing Solana CLI ===="
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo "✓ Solana installed: $(solana --version | head -1)"

echo ""
echo "==== [4/7] Installing Node.js and Yarn ===="
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y -qq nodejs
npm install -g yarn
echo "✓ Node installed: $(node --version)"

echo ""
echo "==== [5/7] Installing Anchor CLI (this will take 10-15 minutes) ===="
cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 anchor-cli --locked
. "$HOME/.cargo/env"
echo "✓ Anchor installed: $(anchor --version)"

echo ""
echo "==== [6/7] Installing Arcium CLI ===="
. "$HOME/.cargo/env"
# Skip dependency check since we already installed everything
export SKIP_DEPS_CHECK=1
curl -fsSL https://install.arcium.com | bash || echo "Arcium CLI install had issues, but toolchain may still work"
echo "✓ Arcium CLI installation attempted"

echo ""
echo "==== [7/7] Final verification ===="
. "$HOME/.cargo/env"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
rustc --version
solana --version | head -1
node --version
anchor --version
arcup --version 2>/dev/null || echo "Note: arcup may need PATH configuration"

echo ""
echo "==== Installation complete! ===="
