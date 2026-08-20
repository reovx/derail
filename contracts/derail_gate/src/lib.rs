#![no_std]

//! `derail_gate` — an upgrade cannot land until N approvers have signed for it.
//!
//! Derail records that contract deploys are rare, high-stakes and hard to undo.
//! This is the part that does something about it: the gate holds the target's
//! upgrade authority, so the rule is enforced by the contract rather than by
//! policy. A rule in Postgres is bypassed by running the `stellar` CLI directly;
//! this one is not, and "who approved this?" is answered by a signature rather
//! than by a row.
//!
//! Approvals are individual transactions, deliberately. Soroban can collect
//! pre-signed authorization entries off-chain and submit one transaction at the
//! end, but then a rejected proposal — or one abandoned at 1-of-2 — leaves no
//! on-chain trace at all. That would recreate the exact disease this product
//! exists to cure: the tool whose thesis is *failed attempts are invisible*
//! failing to record its own most important artifact, the deploy that was
//! stopped.
//!
//! See `docs/specs/SPEC-BELT-LEVELS.md` §2.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, vec, Address,
    BytesN, Env, IntoVal, Vec,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const ENTRY_TTL_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const ENTRY_TTL_EXTEND_TO: u32 = 90 * DAY_IN_LEDGERS;

/// How long a proposal stays actionable, in ledgers (~7 days).
///
/// Without an expiry, an approval collected today could be cashed in months
/// later against code nobody has looked at since. The approver signed for a
/// decision, not for a standing permission.
pub const PROPOSAL_LIFETIME_LEDGERS: u32 = 7 * DAY_IN_LEDGERS;

/// Bounded so a target cannot be registered with an approver set too large to
/// iterate within the contract's budget.
const MAX_APPROVERS: u32 = 20;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// Configuration for one gated target.
    Target(Address),
    /// Monotonic proposal counter, per target.
    ProposalCount(Address),
    Proposal(Address, u32),
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct TargetConfig {
    pub approvers: Vec<Address>,
    pub threshold: u32,
    pub admin: Address,
}

/// `Open → Approved → Executed`, plus `Rejected` and `Expired`.
///
/// Only `Open`, `Executed` and `Rejected` are ever *stored*. `Approved` and
/// `Expired` are derived on read, because both depend on state outside the
/// proposal: whether the threshold is met depends on the current approver set,
/// and whether it has expired depends on the ledger. Writing them would let
/// storage claim something the live rules disagree with.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracttype]
pub enum ProposalStatus {
    Open,
    Approved,
    Executed,
    Rejected,
    Expired,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Proposal {
    pub id: u32,
    pub target: Address,
    pub wasm_hash: BytesN<32>,
    pub proposer: Address,
    /// Who has approved, in order. Only approvals from addresses still in the
    /// approver set count toward the threshold — see [`DerailGate::execute`].
    pub approvals: Vec<Address>,
    pub status: ProposalStatus,
    pub created_ledger: u32,
    pub expires_at_ledger: u32,
    /// Rejections are terminal, and this names who ended it.
    pub rejected_by: Option<Address>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    TargetAlreadyRegistered = 1,
    TargetNotRegistered = 2,
    ProposalNotFound = 3,
    /// Not in the approver set for this target.
    NotAnApprover = 4,
    /// An approver may only approve once.
    AlreadyApproved = 5,
    /// The proposer may not approve their own proposal.
    SelfApproval = 6,
    /// `Executed` and `Rejected` are terminal.
    ProposalClosed = 7,
    ProposalExpired = 8,
    /// Fewer approvals than the target's threshold.
    ThresholdNotMet = 9,
    /// Threshold must be at least 1 and leave the proposal executable.
    InvalidThreshold = 10,
    /// Empty, oversized, or duplicate-containing approver set.
    InvalidApprovers = 11,
}

// ---------------------------------------------------------------------------
// Events — SPEC-BELT-LEVELS.md §2.4.
//
//   topic 0  "derail"    constant, so one predicate filters every event
//   topic 1  the verb
//   topic 2  target      indexed, so a consumer can watch one target without
//                        decoding the body of every event
//
// Declared with `#[contractevent]` so they enter the contract spec and
// `stellar contract bindings typescript` generates their types.
// ---------------------------------------------------------------------------

#[contractevent(topics = ["derail", "registered"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TargetRegistered {
    #[topic]
    pub target: Address,
    pub approvers: Vec<Address>,
    pub threshold: u32,
}

#[contractevent(topics = ["derail", "proposed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeProposed {
    #[topic]
    pub target: Address,
    pub proposal_id: u32,
    pub wasm_hash: BytesN<32>,
    pub proposer: Address,
}

#[contractevent(topics = ["derail", "approved"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeApproved {
    #[topic]
    pub target: Address,
    pub proposal_id: u32,
    pub approver: Address,
}

#[contractevent(topics = ["derail", "rejected"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeRejected {
    #[topic]
    pub target: Address,
    pub proposal_id: u32,
    pub approver: Address,
}

#[contractevent(topics = ["derail", "executed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeExecuted {
    #[topic]
    pub target: Address,
    pub proposal_id: u32,
    pub wasm_hash: BytesN<32>,
}

#[contractevent(topics = ["derail", "approvers"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApproversChanged {
    #[topic]
    pub target: Address,
    pub approvers: Vec<Address>,
    pub threshold: u32,
}

#[contract]
pub struct DerailGate;

#[contractimpl]
impl DerailGate {
    /// Register a target and the set of addresses allowed to approve its
    /// upgrades. Errors if the target is already registered rather than
    /// overwriting, because silently replacing an approver set is the one thing
    /// a gate must never do.
    pub fn register_target(
        env: Env,
        target: Address,
        approvers: Vec<Address>,
        threshold: u32,
        admin: Address,
    ) -> Result<(), Error> {
        admin.require_auth();

        let key = DataKey::Target(target.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::TargetAlreadyRegistered);
        }

        Self::check_approver_set(&approvers, threshold)?;

        env.storage().persistent().set(
            &key,
            &TargetConfig {
                approvers: approvers.clone(),
                threshold,
                admin,
            },
        );
        Self::bump(&env, &key);

        TargetRegistered {
            target,
            approvers,
            threshold,
        }
        .publish(&env);

        Ok(())
    }

    /// Propose swapping the target's code for `new_wasm_hash`.
    ///
    /// The proposer must be an approver: a gate that anyone can queue proposals
    /// against is a spam surface, and the approver set is the list of people
    /// with standing to ask.
    pub fn propose_upgrade(
        env: Env,
        target: Address,
        new_wasm_hash: BytesN<32>,
        proposer: Address,
    ) -> Result<u32, Error> {
        proposer.require_auth();

        let config = Self::config(&env, &target)?;
        if !config.approvers.contains(&proposer) {
            return Err(Error::NotAnApprover);
        }

        let count_key = DataKey::ProposalCount(target.clone());
        let id: u32 = env.storage().persistent().get(&count_key).unwrap_or(0) + 1;
        env.storage().persistent().set(&count_key, &id);
        Self::bump(&env, &count_key);

        let ledger = env.ledger().sequence();
        let proposal = Proposal {
            id,
            target: target.clone(),
            wasm_hash: new_wasm_hash.clone(),
            proposer: proposer.clone(),
            approvals: Vec::new(&env),
            status: ProposalStatus::Open,
            created_ledger: ledger,
            expires_at_ledger: ledger + PROPOSAL_LIFETIME_LEDGERS,
            rejected_by: None,
        };

        let key = DataKey::Proposal(target.clone(), id);
        env.storage().persistent().set(&key, &proposal);
        Self::bump(&env, &key);

        UpgradeProposed {
            target,
            proposal_id: id,
            wasm_hash: new_wasm_hash,
            proposer,
        }
        .publish(&env);

        Ok(id)
    }

    /// Approve a proposal. One signature, one transaction, permanently on-chain.
    pub fn approve(
        env: Env,
        target: Address,
        proposal_id: u32,
        approver: Address,
    ) -> Result<(), Error> {
        approver.require_auth();

        let config = Self::config(&env, &target)?;
        let mut proposal = Self::open_proposal(&env, &target, proposal_id)?;

        if !config.approvers.contains(&approver) {
            return Err(Error::NotAnApprover);
        }
        // Same rule as code review, and for the same reason: the person who
        // wrote the change is not the second pair of eyes on it.
        if proposal.proposer == approver {
            return Err(Error::SelfApproval);
        }
        if proposal.approvals.contains(&approver) {
            return Err(Error::AlreadyApproved);
        }

        proposal.approvals.push_back(approver.clone());
        Self::save(&env, &target, &proposal);

        UpgradeApproved {
            target,
            proposal_id,
            approver,
        }
        .publish(&env);

        Ok(())
    }

    /// Reject a proposal. Terminal — one rejection kills it.
    ///
    /// The proposer may reject their own proposal, which is how a proposal is
    /// withdrawn. There is no separate cancel, and a withdrawal should leave the
    /// same permanent trace as any other rejection.
    pub fn reject(
        env: Env,
        target: Address,
        proposal_id: u32,
        approver: Address,
    ) -> Result<(), Error> {
        approver.require_auth();

        let config = Self::config(&env, &target)?;
        let mut proposal = Self::open_proposal(&env, &target, proposal_id)?;

        if !config.approvers.contains(&approver) {
            return Err(Error::NotAnApprover);
        }

        proposal.status = ProposalStatus::Rejected;
        proposal.rejected_by = Some(approver.clone());
        Self::save(&env, &target, &proposal);

        UpgradeRejected {
            target,
            proposal_id,
            approver,
        }
        .publish(&env);

        Ok(())
    }

    /// Execute an approved proposal: the cross-contract call that actually
    /// swaps the target's code.
    ///
    /// Unauthenticated on purpose. Every condition that matters has already been
    /// signed for, so anyone may push the button once the threshold is met —
    /// including a bot, which means the last approver does not have to come back
    /// and pay a second fee.
    ///
    /// Only approvals from addresses **still in the approver set** count. An
    /// approver removed since they signed no longer contributes, so removing
    /// someone takes effect immediately rather than after the proposals they
    /// touched have drained.
    pub fn execute(env: Env, target: Address, proposal_id: u32) -> Result<(), Error> {
        let config = Self::config(&env, &target)?;
        let mut proposal = Self::open_proposal(&env, &target, proposal_id)?;

        let mut effective: u32 = 0;
        for approver in proposal.approvals.iter() {
            if config.approvers.contains(&approver) {
                effective += 1;
            }
        }
        if effective < config.threshold {
            return Err(Error::ThresholdNotMet);
        }

        // The gate holds the target's upgrade authority, so this call is the
        // whole reason the gate has to be a contract: a database cannot sign a
        // Soroban transaction, so it could never be what the target trusts.
        env.invoke_contract::<()>(
            &target,
            &symbol_short!("upgrade"),
            vec![&env, proposal.wasm_hash.clone().into_val(&env)],
        );

        proposal.status = ProposalStatus::Executed;
        Self::save(&env, &target, &proposal);

        UpgradeExecuted {
            target,
            proposal_id,
            wasm_hash: proposal.wasm_hash,
        }
        .publish(&env);

        Ok(())
    }

    /// Replace the approver set, authorised by the *current* threshold of
    /// current approvers.
    ///
    /// Not by the admin. If one key could rewrite the approver set, the gate
    /// would be bypassed by adding yourself, and every approval it ever
    /// collected would be worth nothing.
    pub fn set_approvers(
        env: Env,
        target: Address,
        approvers: Vec<Address>,
        threshold: u32,
        signers: Vec<Address>,
    ) -> Result<(), Error> {
        let config = Self::config(&env, &target)?;
        Self::check_approver_set(&approvers, threshold)?;

        let mut counted: Vec<Address> = Vec::new(&env);
        for signer in signers.iter() {
            if !config.approvers.contains(&signer) {
                return Err(Error::NotAnApprover);
            }
            if counted.contains(&signer) {
                return Err(Error::AlreadyApproved);
            }
            // Each signer authorises individually — the same per-approver
            // signature the approval path requires, collected in one call
            // because there is no intermediate state worth recording here.
            signer.require_auth();
            counted.push_back(signer);
        }

        if counted.len() < config.threshold {
            return Err(Error::ThresholdNotMet);
        }

        let key = DataKey::Target(target.clone());
        env.storage().persistent().set(
            &key,
            &TargetConfig {
                approvers: approvers.clone(),
                threshold,
                admin: config.admin,
            },
        );
        Self::bump(&env, &key);

        ApproversChanged {
            target,
            approvers,
            threshold,
        }
        .publish(&env);

        Ok(())
    }

    /// Read a proposal, with `Approved` and `Expired` resolved against current
    /// state rather than reported from storage.
    pub fn get_proposal(env: Env, target: Address, proposal_id: u32) -> Result<Proposal, Error> {
        let config = Self::config(&env, &target)?;
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(target, proposal_id))
            .ok_or(Error::ProposalNotFound)?;

        if proposal.status == ProposalStatus::Open {
            if env.ledger().sequence() > proposal.expires_at_ledger {
                proposal.status = ProposalStatus::Expired;
            } else {
                let mut effective: u32 = 0;
                for approver in proposal.approvals.iter() {
                    if config.approvers.contains(&approver) {
                        effective += 1;
                    }
                }
                if effective >= config.threshold {
                    proposal.status = ProposalStatus::Approved;
                }
            }
        }

        Ok(proposal)
    }

    pub fn get_target(env: Env, target: Address) -> Result<TargetConfig, Error> {
        Self::config(&env, &target)
    }
}

impl DerailGate {
    fn config(env: &Env, target: &Address) -> Result<TargetConfig, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Target(target.clone()))
            .ok_or(Error::TargetNotRegistered)
    }

    /// Loads a proposal that can still be acted on, rejecting the terminal and
    /// expired cases in one place so no entry point can forget one.
    fn open_proposal(env: &Env, target: &Address, id: u32) -> Result<Proposal, Error> {
        let proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(target.clone(), id))
            .ok_or(Error::ProposalNotFound)?;

        match proposal.status {
            ProposalStatus::Executed | ProposalStatus::Rejected => {
                return Err(Error::ProposalClosed)
            }
            _ => {}
        }

        if env.ledger().sequence() > proposal.expires_at_ledger {
            return Err(Error::ProposalExpired);
        }

        Ok(proposal)
    }

    fn save(env: &Env, target: &Address, proposal: &Proposal) {
        let key = DataKey::Proposal(target.clone(), proposal.id);
        env.storage().persistent().set(&key, proposal);
        Self::bump(env, &key);
    }

    /// A threshold must leave the proposal executable. Since the proposer cannot
    /// approve their own proposal, a 2-approver target with a threshold of 2
    /// could never pass anything — so the ceiling is one below the set size, and
    /// the error surfaces at registration rather than at the first stuck
    /// upgrade.
    fn check_approver_set(approvers: &Vec<Address>, threshold: u32) -> Result<(), Error> {
        let size = approvers.len();
        // Two is the floor because a single approver is not a review gate.
        if !(2..=MAX_APPROVERS).contains(&size) {
            return Err(Error::InvalidApprovers);
        }

        for (index, approver) in approvers.iter().enumerate() {
            for other in approvers.iter().skip(index + 1) {
                if approver == other {
                    return Err(Error::InvalidApprovers);
                }
            }
        }

        if threshold == 0 || threshold > size - 1 {
            return Err(Error::InvalidThreshold);
        }

        Ok(())
    }

    fn bump(env: &Env, key: &DataKey) {
        env.storage()
            .persistent()
            .extend_ttl(key, ENTRY_TTL_THRESHOLD, ENTRY_TTL_EXTEND_TO);
    }
}

#[cfg(test)]
mod test;
