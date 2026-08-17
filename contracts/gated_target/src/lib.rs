#![no_std]

//! The gated target template — `SPEC-BELT-LEVELS.md` §2.2.
//!
//! Build your contract on this and upgrades are gated by default: the gate holds
//! the upgrade authority, so nothing can swap this contract's code until the
//! required approvers have signed for it on-chain.
//!
//! **This decision cannot be retrofitted.** A contract already live with a plain
//! admin key answers to that key forever — the gate only governs contracts
//! written against it. It costs nothing to adopt at first deploy and is
//! impossible to adopt later, which makes it the sharpest constraint in the
//! product.
//!
//! Replace `version` and `set_message` with your own logic. Leave `upgrade`
//! exactly as it is.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, String,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// The `derail_gate` instance holding this contract's upgrade authority.
    Gate,
    Message,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
}

#[contract]
pub struct GatedTarget;

#[contractimpl]
impl GatedTarget {
    /// Bind this contract to a gate, once and irreversibly.
    ///
    /// There is deliberately no `set_gate`. A contract that can be re-pointed at
    /// a different gate by whoever holds a key is not gated — it is gated until
    /// someone decides otherwise, which is the same as not being gated.
    pub fn initialize(env: Env, gate: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Gate) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Gate, &gate);
        Ok(())
    }

    /// Swap this contract's code. Only the gate may call it.
    ///
    /// The authority is read from storage, never taken as an argument — an
    /// argument would let the caller nominate whoever they liked as the gate.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        let gate: Address = env
            .storage()
            .instance()
            .get(&DataKey::Gate)
            .ok_or(Error::NotInitialized)?;

        gate.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    pub fn gate(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Gate)
            .ok_or(Error::NotInitialized)
    }

    // --- Everything below is example payload, safe to replace. ---

    pub fn version(_env: Env) -> u32 {
        1
    }

    pub fn set_message(env: Env, message: String) {
        env.storage().instance().set(&DataKey::Message, &message);
    }

    pub fn message(env: Env) -> Option<String> {
        env.storage().instance().get(&DataKey::Message)
    }
}
