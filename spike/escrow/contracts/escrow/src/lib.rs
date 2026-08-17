#![no_std]

//! Escrow — a deliberately fallible contract used to characterise `stellar` CLI
//! output for the Derail wrapper spike.
//!
//! Each entry point is chosen to fail at a *different stage* of the deploy
//! pipeline, so the wrapper can be tested against every class of failure it will
//! have to recognise in the wild:
//!
//! | fn                     | fails at            | produces a tx hash? |
//! |------------------------|---------------------|---------------------|
//! | `initialize` (2nd call)| simulation          | no                  |
//! | `release` (bad auth)   | simulation          | no                  |
//! | `release` (expired)    | on-chain execution  | **yes**             |
//! | `upgrade` (bad hash)   | tbd — see captures  | tbd                 |
//!
//! The third row is the one that matters. Every existing Stellar tool can see
//! rows 1, 2 and 4 only as an absence — no contract, no attestation, no explorer
//! entry. Derail's whole claim rests on recording them anyway.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, BytesN, Env};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Config,
    ReleasedAt,
}

#[derive(Clone)]
#[contracttype]
pub struct Config {
    pub admin: Address,
    pub beneficiary: Address,
    /// Ledger close time (unix seconds) after which the escrow can no longer be released.
    pub deadline: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    AlreadyReleased = 3,
    /// The tx landed in a later ledger than the caller simulated against.
    Expired = 4,
    /// The escrow's wall-clock deadline passed before the tx was included.
    DeadlinePassed = 5,
}

#[contract]
pub struct Escrow;

#[contractimpl]
impl Escrow {
    /// One-shot setup. Calling it twice fails during *simulation*, because the
    /// `Config` key is already present in the state the simulator reads.
    pub fn initialize(
        env: Env,
        admin: Address,
        beneficiary: Address,
        deadline: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(
            &DataKey::Config,
            &Config {
                admin,
                beneficiary,
                deadline,
            },
        );
        Ok(())
    }

    /// Release the escrow to the beneficiary.
    ///
    /// `valid_through_ledger` is an optimistic-concurrency guard: the caller
    /// asserts "only apply this if it lands at or before ledger N". It is the
    /// same shape as a DEX slippage bound or an HTTP `If-Match` — a real
    /// pattern, not a contrivance.
    ///
    /// It is also the lever that makes an on-chain failure *deterministic*.
    /// Simulation runs against the latest closed ledger, N. Pass
    /// `valid_through_ledger = N` and the guard holds during simulation
    /// (`N > N` is false) but cannot hold at execution, because the tx is
    /// necessarily included in a ledger strictly after the one simulated.
    /// Simulation green, chain red, every time.
    pub fn release(env: Env, valid_through_ledger: u32) -> Result<u32, Error> {
        let cfg: Config = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)?;

        cfg.beneficiary.require_auth();

        if env.storage().instance().has(&DataKey::ReleasedAt) {
            return Err(Error::AlreadyReleased);
        }

        let seq = env.ledger().sequence();
        if seq > valid_through_ledger {
            return Err(Error::Expired);
        }
        if env.ledger().timestamp() > cfg.deadline {
            return Err(Error::DeadlinePassed);
        }

        env.storage().instance().set(&DataKey::ReleasedAt, &seq);
        Ok(seq)
    }

    /// Swap the contract's own code. Used to test whether a bogus wasm hash is
    /// caught by the simulator or only by the validators — the answer decides
    /// whether the demo script in DECISIONS.md actually holds up.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        let cfg: Config = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)?;

        cfg.admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Read-only accessor, so a capture run can prove whether a failed attempt
    /// mutated anything.
    pub fn status(env: Env) -> Option<u32> {
        env.storage().instance().get(&DataKey::ReleasedAt)
    }

    pub fn config(env: Env) -> Result<Config, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)
    }
}

mod test;
