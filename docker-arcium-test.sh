#!/bin/bash
# Arcium Testing via Docker - Run this when Docker network is stable
set -e

echo "==== Installing Arcium CLI in Docker ===="

docker run --rm -it \
  -v /c/Users/GUDMAN/Desktop/blind-link:/workspace \
  -v /c/Users/GUDMAN/.config/solana:/root/.config/solana:ro \
  -e ARCIUM_CLUSTER_OFFSET=456 \
  ubuntu:22.04 bash -c '
    cd /workspace

    # Install dependencies
    apt-get update -qq
    apt-get install -y curl build-essential git > /dev/null

    # Install Rust
    curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env

    # Install Solana CLI
    sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

    # Install Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs

    # Install Yarn
    npm install -g yarn

    # Install Anchor
    cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 anchor-cli --locked

    # Install Arcium CLI
    curl -fsSL https://install.arcium.com | sh
    source $HOME/.cargo/env

    echo "==== Building Project ===="
    arcium build

    echo "==== Deploying to Devnet ===="
    arcium deploy \
      --cluster-offset 456 \
      --recovery-set-size 4 \
      --keypair-path /root/.config/solana/id.json \
      --rpc-url https://api.devnet.solana.com

    echo "==== Running Tests ===="
    ARCIUM_CLUSTER_OFFSET=456 arcium test --cluster devnet
'
