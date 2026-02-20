// ============================================================================
// Project Blind-Link: Solana Coordination Layer (Anchor 0.30+)
// ============================================================================
// On-chain program managing MXE session lifecycle for Private Set Intersection.
// Handles: session initialization, encrypted contact list commitment,
// computation queueing, and MXE execution proof verification via callbacks.
// ============================================================================

use anchor_lang::prelude::*;
use arcium_anchor::comp_def_offset;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

declare_id!("88vVM7s7TKCPeJ8DNHnctTTTWFWwSmSDAxnuTRjuzTyn");

// ── State Accounts ──────────────────────────────────────────────────────

/// Global registry account storing MXE-encrypted user fingerprints.
/// Bucket layout: 4 buckets × 16 entries per bucket = 64 max users.
/// Actual capacity may be less due to hash collisions in bucket assignment.
#[account]
pub struct RegistryState {
    pub bump: u8,
    /// MXE-encrypted bucket data (4 buckets × 16 slots × u128 fingerprints + counts)
    /// Layout serialized by Arcium MXE during computation callbacks
    pub encrypted_data: Vec<u8>,
    /// Encryption nonce for MXE state
    pub nonce: u128,
    /// Authority that can manage the registry
    pub authority: Pubkey,
    /// Total PSI queries processed (not user count; that's encrypted in MXE)
    pub computation_count: u64,
}

/// Per-session account tracking an active PSI computation.
/// Created when a user initiates contact intersection, closed on callback.
#[account]
pub struct PsiSession {
    pub bump: u8,
    /// The user who initiated this PSI session
    pub user: Pubkey,
    /// Unique computation offset for Arcium routing
    pub computation_offset: u64,
    /// Encrypted result ciphertext (populated by callback)
    pub result_ciphertext: Vec<u8>,
    /// Result nonce for client-side decryption
    pub result_nonce: [u8; 16],
    /// Session status: 0 = pending, 1 = computing, 2 = completed, 3 = failed
    pub status: u8,
    /// Timestamp of session creation
    pub created_at: i64,
}

// ── Constants ───────────────────────────────────────────────────────────

const REGISTRY_SEED: &[u8] = b"blind_link_registry";
const SESSION_SEED: &[u8] = b"psi_session";

// ── Program ─────────────────────────────────────────────────────────────

#[arcium_program]
pub mod blind_link {
    use super::*;

    // ── 1. Initialize Global Registry ───────────────────────────────

    /// One-time initialization of the Global User Registry.
    /// Creates the on-chain account that holds MXE-encrypted state.
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry_state;
        registry.bump = ctx.bumps.registry_state;
        registry.authority = ctx.accounts.authority.key();
        registry.computation_count = 0;
        registry.nonce = 0;
        // Encrypted data initialized empty; first register_user call populates it
        registry.encrypted_data = vec![0u8; 0];

        msg!("Blind-Link: Global Registry initialized");
        Ok(())
    }

    // ── 2. Computation Definition Initializers ──────────────────────

    /// Initialize the computation definition for intersect_contacts.
    /// Called once after deployment to register the MPC circuit with Arcium.
    pub fn init_intersect_contacts_comp_def(
        ctx: Context<InitIntersectContactsCompDef>,
    ) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        msg!("Blind-Link: intersect_contacts comp_def registered");
        Ok(())
    }

    /// Initialize the computation definition for register_user.
    pub fn init_register_user_comp_def(
        ctx: Context<InitRegisterUserCompDef>,
    ) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        msg!("Blind-Link: register_user comp_def registered");
        Ok(())
    }

    /// Initialize the computation definition for reveal_registry_size.
    pub fn init_reveal_registry_size_comp_def(
        ctx: Context<InitRevealRegistrySizeCompDef>,
    ) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        msg!("Blind-Link: reveal_registry_size comp_def registered");
        Ok(())
    }


    /// Initialize the computation definition for init_registry.
    pub fn init_init_registry_comp_def(
        ctx: Context<InitInitRegistryCompDef>,
    ) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        msg!("Blind-Link: init_registry comp_def registered");
        Ok(())
    }

    // ── 3. Queue PSI Computation ────────────────────────────────────

    /// Submit encrypted contact hashes for private intersection.
    ///
    /// Flow:
    ///   1. Client encrypts contact hashes locally (salted SHA-256 → u128)
    ///   2. Client calls this instruction with ciphertexts
    ///   3. Arcium routes ciphertexts + registry state to MXE cluster
    ///   4. MPC nodes execute intersect_contacts circuit
    ///   5. Result returned via intersect_contacts_callback
    ///
    /// # Arguments
    /// * `computation_offset` - Unique ID for this computation
    /// * `encrypted_hashes` - Client's encrypted contact hashes (Rescue cipher)
    /// * `encrypted_count`  - Encrypted count of actual contacts
    /// * `pub_key`          - Client's x25519 public key for key exchange
    /// * `nonce`            - Encryption nonce (16 bytes as u128)
    pub fn intersect_contacts(
        ctx: Context<IntersectContacts>,
        computation_offset: u64,
        encrypted_hashes: Vec<[u8; 32]>,
        encrypted_count: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        // Initialize session tracking account
        let session = &mut ctx.accounts.psi_session;
        session.bump = ctx.bumps.psi_session;
        session.user = ctx.accounts.user.key();
        session.computation_offset = computation_offset;
        session.status = 1; // computing
        session.created_at = Clock::get()?.unix_timestamp;
        session.result_ciphertext = vec![];
        session.result_nonce = [0u8; 16];

        // Build computation arguments:
        // Arg 1 (Enc<Shared, ClientContacts>): client's encrypted contacts
        let mut arg_builder = ArgBuilder::new()
            .x25519_pubkey(pub_key)
            .plaintext_u128(nonce);

        // Append each encrypted contact hash
        for hash_ct in encrypted_hashes.iter() {
            arg_builder = arg_builder.encrypted_u128(*hash_ct);
        }
        // Append encrypted count
        arg_builder = arg_builder.encrypted_u64(encrypted_count);

        // Arg 2 (Enc<Mxe, GlobalRegistry>): read from on-chain registry state
        let registry_key = ctx.accounts.registry_state.key();
        let registry_data_offset = 8 + 1; // discriminator + bump
        let registry_data_len = ctx.accounts.registry_state.encrypted_data.len();

        let args = arg_builder
            .account(registry_key, registry_data_offset as u32, registry_data_len as u32)
            .build();

        // Initialize sign PDA bump for CPI signing
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Queue the MPC computation with callback
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![IntersectContactsCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.psi_session.key(),
                    is_writable: true,
                }],
            )?],
            1, // num_transactions
            0, // priority_fee
        )?;

        // Increment computation counter
        let registry = &mut ctx.accounts.registry_state;
        registry.computation_count += 1;

        msg!(
            "Blind-Link: PSI computation queued (offset: {}, contacts: {})",
            computation_offset,
            encrypted_hashes.len()
        );
        Ok(())
    }

    // ── 4. PSI Callback ─────────────────────────────────────────────

    /// Callback invoked by Arcium after MXE completes the intersection.
    /// Verifies the cluster's execution proof and stores the encrypted
    /// result for client retrieval.
    #[arcium_callback(encrypted_ix = "intersect_contacts")]
    pub fn intersect_contacts_callback(
        ctx: Context<IntersectContactsCallback>,
        output: SignedComputationOutputs<IntersectContactsOutput>,
    ) -> Result<()> {
        let verified = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(out) => out,
            Err(e) => {
                msg!("Blind-Link: PSI verification failed: {}", e);
                // Mark session as failed
                let session = &mut ctx.accounts.psi_session;
                session.status = 3; // failed
                return Err(ErrorCode::VerificationFailed.into());
            }
        };

        // Store encrypted result in session account for client retrieval
        let session = &mut ctx.accounts.psi_session;
        session.result_ciphertext = verified.field_0.ciphertexts.iter().flat_map(|c| c.to_vec()).collect();
        session.result_nonce = verified.field_0.nonce.to_le_bytes();
        session.status = 2; // completed

        emit!(PsiCompleteEvent {
            user: session.user,
            computation_offset: session.computation_offset,
            result_ciphertexts: verified.field_0.ciphertexts.to_vec(),
            result_nonce: verified.field_0.nonce.to_le_bytes(),
        });

        msg!("Blind-Link: PSI computation completed successfully");
        Ok(())
    }

    // ── 5. Register User ────────────────────────────────────────────

    /// Add a new user's contact hash to the Global Registry.
    /// The hash is encrypted client-side and inserted into the MXE state.
    pub fn register_user(
        ctx: Context<RegisterUser>,
        computation_offset: u64,
        encrypted_hash: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        let registry_key = ctx.accounts.registry_state.key();
        let registry_data_offset = 8 + 1;
        let registry_data_len = ctx.accounts.registry_state.encrypted_data.len();

        let args = ArgBuilder::new()
            .x25519_pubkey(pub_key)
            .plaintext_u128(nonce)
            .encrypted_u128(encrypted_hash)
            .account(registry_key, registry_data_offset as u32, registry_data_len as u32)
            .build();

        // Initialize sign PDA bump for CPI signing
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![RegisterUserCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.registry_state.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        msg!("Blind-Link: User registration queued");
        Ok(())
    }

    /// Callback for register_user: updates the on-chain encrypted registry state.
    #[arcium_callback(encrypted_ix = "register_user")]
    pub fn register_user_callback(
        ctx: Context<RegisterUserCallback>,
        output: SignedComputationOutputs<RegisterUserOutput>,
    ) -> Result<()> {
        let verified = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(out) => out,
            Err(e) => {
                msg!("Blind-Link: Registration verification failed: {}", e);
                return Err(ErrorCode::VerificationFailed.into());
            }
        };

        // Update registry with new encrypted state from MXE
        let registry = &mut ctx.accounts.registry_state;
        registry.encrypted_data = verified.field_0.ciphertexts.iter().flat_map(|c| c.to_vec()).collect();
        registry.nonce = u128::from_le_bytes(verified.field_0.nonce.to_le_bytes());

        // Note: Actual user count is encrypted in MXE state; cannot be read here
        emit!(UserRegisteredEvent {
            registry: registry.key(),
        });

        msg!("Blind-Link: User registered in Global Registry");
        Ok(())
    }

    // ── 6. Reveal Registry Size ─────────────────────────────────────

    pub fn reveal_registry_size(
        ctx: Context<RevealRegistrySize>,
        computation_offset: u64,
    ) -> Result<()> {
        let registry_key = ctx.accounts.registry_state.key();
        let registry_data_offset = 8 + 1;
        let registry_data_len = ctx.accounts.registry_state.encrypted_data.len();

        let args = ArgBuilder::new()
            .account(registry_key, registry_data_offset as u32, registry_data_len as u32)
            .build();

        // Initialize sign PDA bump for CPI signing
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![RevealRegistrySizeCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "reveal_registry_size")]
    pub fn reveal_registry_size_callback(
        ctx: Context<RevealRegistrySizeCallback>,
        output: SignedComputationOutputs<RevealRegistrySizeOutput>,
    ) -> Result<()> {
        let verified = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(out) => out,
            Err(e) => {
                msg!("Blind-Link: Size reveal failed: {}", e);
                return Err(ErrorCode::VerificationFailed.into());
            }
        };

        emit!(RegistrySizeEvent {
            total_users: verified.field_0,
        });

        msg!("Blind-Link: Registry size = {}", verified.field_0);
        Ok(())
    }

    // ── 7. Bootstrap Registry ───────────────────────────────────────

    /// Queue MXE computation to create initial encrypted registry state.
    /// Must be called once after deployment, before any register_user.
    pub fn queue_init_registry(
        ctx: Context<QueueInitRegistry>,
        computation_offset: u64,
    ) -> Result<()> {
        // Initialize sign PDA bump for CPI signing
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // No encrypted inputs — the circuit creates state from scratch
        let args = ArgBuilder::new().build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![InitRegistryCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.registry_state.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        msg!("Blind-Link: Registry bootstrap computation queued");
        Ok(())
    }

    /// Callback for init_registry: stores the initial MXE-encrypted state.
    #[arcium_callback(encrypted_ix = "init_registry")]
    pub fn init_registry_callback(
        ctx: Context<InitRegistryCallback>,
        output: SignedComputationOutputs<InitRegistryOutput>,
    ) -> Result<()> {
        let verified = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(out) => out,
            Err(e) => {
                msg!("Blind-Link: Registry init verification failed: {}", e);
                return Err(ErrorCode::VerificationFailed.into());
            }
        };

        let registry = &mut ctx.accounts.registry_state;
        registry.encrypted_data = verified.field_0.ciphertexts.iter().flat_map(|c| c.to_vec()).collect();
        registry.nonce = u128::from_le_bytes(verified.field_0.nonce.to_le_bytes());

        msg!("Blind-Link: Registry bootstrapped with MXE-encrypted initial state ({} bytes)", registry.encrypted_data.len());
        Ok(())
    }


// ── Comp Def Offsets ────────────────────────────────────────────────────

const COMP_DEF_OFFSET_INTERSECT_CONTACTS: u32 = comp_def_offset("intersect_contacts");
const COMP_DEF_OFFSET_REGISTER_USER: u32 = comp_def_offset("register_user");
const COMP_DEF_OFFSET_REVEAL_REGISTRY_SIZE: u32 = comp_def_offset("reveal_registry_size");
const COMP_DEF_OFFSET_INIT_REGISTRY: u32 = comp_def_offset("init_registry");

// ── Account Structs ─────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = authority,
        space = 10240,
        seeds = [REGISTRY_SEED],
        bump
    )]
    pub registry_state: Account<'info, RegistryState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ── Init Computation Definition Accounts ────────────────────────────────

#[init_computation_definition_accounts("intersect_contacts", payer)]
#[derive(Accounts)]
pub struct InitIntersectContactsCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("register_user", payer)]
#[derive(Accounts)]
pub struct InitRegisterUserCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("reveal_registry_size", payer)]
#[derive(Accounts)]
pub struct InitRevealRegistrySizeCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ── Queue Computation Accounts ──────────────────────────────────────────

#[queue_computation_accounts("intersect_contacts", user)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct IntersectContacts<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + 1 + 32 + 8 + 4 + 16 + 1 + 8 + 2048,
        seeds = [SESSION_SEED, user.key().as_ref(), &computation_offset.to_le_bytes()],
        bump
    )]
    pub psi_session: Account<'info, PsiSession>,
    #[account(mut, seeds = [REGISTRY_SEED], bump = registry_state.bump)]
    pub registry_state: Account<'info, RegistryState>,
    #[account(
        init_if_needed,
        space = 9,
        payer = user,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INTERSECT_CONTACTS))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("register_user", user)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [REGISTRY_SEED], bump = registry_state.bump)]
    pub registry_state: Account<'info, RegistryState>,
    #[account(
        init_if_needed,
        space = 9,
        payer = user,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REGISTER_USER))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("reveal_registry_size", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct RevealRegistrySize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [REGISTRY_SEED], bump = registry_state.bump)]
    pub registry_state: Account<'info, RegistryState>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_REGISTRY_SIZE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

// ── Callback Accounts ───────────────────────────────────────────────────

#[callback_accounts("intersect_contacts")]
#[derive(Accounts)]
pub struct IntersectContactsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INTERSECT_CONTACTS))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: Verified by Arcium callback handler via SignedComputationOutputs
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    /// CHECK: Validated by address constraint matching Solana instructions sysvar ID
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub psi_session: Account<'info, PsiSession>,
}

#[callback_accounts("register_user")]
#[derive(Accounts)]
pub struct RegisterUserCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REGISTER_USER))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: Verified by Arcium callback handler via SignedComputationOutputs
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    /// CHECK: Validated by address constraint matching Solana instructions sysvar ID
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub registry_state: Account<'info, RegistryState>,
}

#[callback_accounts("reveal_registry_size")]
#[derive(Accounts)]
pub struct RevealRegistrySizeCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_REGISTRY_SIZE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: Verified by Arcium callback handler via SignedComputationOutputs
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    /// CHECK: Validated by address constraint matching Solana instructions sysvar ID
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}


#[init_computation_definition_accounts("init_registry", payer)]
#[derive(Accounts)]
pub struct InitInitRegistryCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("init_registry", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct QueueInitRegistry<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [REGISTRY_SEED], bump = registry_state.bump)]
    pub registry_state: Account<'info, RegistryState>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_REGISTRY))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("init_registry")]
#[derive(Accounts)]
pub struct InitRegistryCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_REGISTRY))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: Verified by Arcium callback handler via SignedComputationOutputs
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    /// CHECK: Validated by address constraint matching Solana instructions sysvar ID
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub registry_state: Account<'info, RegistryState>,
}

// ── Events ──────────────────────────────────────────────────────────────

#[event]
pub struct PsiCompleteEvent {
    pub user: Pubkey,
    pub computation_offset: u64,
    pub result_ciphertexts: Vec<[u8; 32]>,
    pub result_nonce: [u8; 16],
}

/// Emitted when a user is successfully registered.
/// Note: The actual user count is encrypted in MXE state and cannot be
/// revealed here without a separate reveal_registry_size call.
#[event]
pub struct UserRegisteredEvent {
    pub registry: Pubkey,
}

#[event]
pub struct RegistrySizeEvent {
    pub total_users: u64,
}

// ── Error Codes ─────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("MXE computation output verification failed")]
    VerificationFailed,
    #[msg("Registry is at maximum capacity")]
    RegistryFull,
    #[msg("Session has already been completed")]
    SessionAlreadyComplete,
    #[msg("Unauthorized: only the session owner can retrieve results")]
    Unauthorized,
    #[msg("Arcium cluster not configured on MXE account")]
    ClusterNotSet,
}
}
