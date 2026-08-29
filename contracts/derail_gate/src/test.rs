#![cfg(test)]

//! Tests for `derail_gate`.
//!
//! The target used here is a stub that records the hash it was asked to apply
//! instead of calling `update_current_contract_wasm`. That one SDK call needs a
//! wasm actually uploaded to the ledger, which a unit test has no way to
//! provide; everything around it — the cross-contract invocation, the gate
//! holding the authority, and the target refusing anyone else — is exercised
//! here, and the real template in `gated_target` differs only in that line.

extern crate std;

use soroban_sdk::{
    testutils::{Address as _, Events, Ledger},
    vec, Address, BytesN, Env, String, Vec,
};

use crate::{DerailGate, DerailGateClient, Error, ProposalStatus, PROPOSAL_LIFETIME_LEDGERS};

/// Mirrors `gated_target::GatedTarget`, minus the one call a unit test cannot make.
mod stub {
    use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env};

    #[derive(Clone)]
    #[contracttype]
    pub enum Key {
        Gate,
        Applied,
    }

    #[contract]
    pub struct StubTarget;

    #[contractimpl]
    impl StubTarget {
        pub fn init(env: Env, gate: Address) {
            env.storage().instance().set(&Key::Gate, &gate);
        }

        pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
            let gate: Address = env.storage().instance().get(&Key::Gate).unwrap();
            gate.require_auth();
            env.storage().instance().set(&Key::Applied, &new_wasm_hash);
        }

        pub fn applied(env: Env) -> Option<BytesN<32>> {
            env.storage().instance().get(&Key::Applied)
        }
    }
}

struct Fixture {
    env: Env,
    gate: DerailGateClient<'static>,
    target: Address,
    target_client: stub::StubTargetClient<'static>,
    admin: Address,
    approvers: Vec<Address>,
}

impl Fixture {
    /// Three approvers, threshold 2: a proposer plus two others, which is the
    /// smallest set where "the proposer cannot self-approve" is not the same as
    /// "one approval is enough".
    fn new() -> Self {
        Self::with(3, 2)
    }

    fn with(approver_count: u32, threshold: u32) -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let gate_id = env.register(DerailGate, ());
        let gate = DerailGateClient::new(&env, &gate_id);

        let target = env.register(stub::StubTarget, ());
        let target_client = stub::StubTargetClient::new(&env, &target);
        target_client.init(&gate_id);

        let admin = Address::generate(&env);
        let mut approvers = Vec::new(&env);
        for _ in 0..approver_count {
            approvers.push_back(Address::generate(&env));
        }

        gate.register_target(&target, &approvers, &threshold, &admin);

        Fixture {
            env,
            gate,
            target,
            target_client,
            admin,
            approvers,
        }
    }

    fn approver(&self, index: u32) -> Address {
        self.approvers.get(index).unwrap()
    }

    fn hash(&self, byte: u8) -> BytesN<32> {
        BytesN::from_array(&self.env, &[byte; 32])
    }

    /// Proposed by approver 0, so approvers 1 and 2 are the ones who can approve.
    fn propose(&self, byte: u8) -> u32 {
        self.gate
            .propose_upgrade(&self.target, &self.hash(byte), &self.approver(0))
    }

    fn reason(&self, text: &str) -> String {
        String::from_str(&self.env, text)
    }
}

// --- registration ---------------------------------------------------------

#[test]
fn register_stores_the_approver_set() {
    let f = Fixture::new();
    let config = f.gate.get_target(&f.target);

    assert_eq!(config.threshold, 2);
    assert_eq!(config.approvers.len(), 3);
    assert_eq!(config.admin, f.admin);
}

#[test]
fn registering_twice_errors() {
    let f = Fixture::new();
    let result = f
        .gate
        .try_register_target(&f.target, &f.approvers, &2, &f.admin);

    // Overwriting would silently replace an approver set, which is the one
    // thing a gate must never do.
    assert_eq!(result, Err(Ok(Error::TargetAlreadyRegistered)));
}

#[test]
#[should_panic]
fn register_requires_admin_auth() {
    let env = Env::default();
    // No mock_all_auths: the admin signature is genuinely required.
    let gate = DerailGateClient::new(&env, &env.register(DerailGate, ()));
    let admin = Address::generate(&env);
    let approvers = vec![
        &env,
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ];

    gate.register_target(&Address::generate(&env), &approvers, &2, &admin);
}

#[test]
fn a_threshold_that_could_never_pass_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let gate = DerailGateClient::new(&env, &env.register(DerailGate, ()));
    let admin = Address::generate(&env);
    let two = vec![&env, Address::generate(&env), Address::generate(&env)];

    // Two approvers with a threshold of two can never execute anything, because
    // the proposer cannot approve their own proposal. Better to fail here than
    // at the first stuck upgrade.
    assert_eq!(
        gate.try_register_target(&Address::generate(&env), &two, &2, &admin),
        Err(Ok(Error::InvalidThreshold))
    );

    assert_eq!(
        gate.try_register_target(&Address::generate(&env), &two, &0, &admin),
        Err(Ok(Error::InvalidThreshold))
    );
}

#[test]
fn duplicate_and_undersized_approver_sets_are_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let gate = DerailGateClient::new(&env, &env.register(DerailGate, ()));
    let admin = Address::generate(&env);
    let repeated = Address::generate(&env);

    assert_eq!(
        gate.try_register_target(
            &Address::generate(&env),
            &vec![
                &env,
                repeated.clone(),
                repeated.clone(),
                Address::generate(&env)
            ],
            &1,
            &admin
        ),
        Err(Ok(Error::InvalidApprovers))
    );

    // A single approver is not a review gate, whatever threshold you give it.
    assert_eq!(
        gate.try_register_target(&Address::generate(&env), &vec![&env, repeated], &1, &admin),
        Err(Ok(Error::InvalidApprovers))
    );
}

#[test]
fn acting_on_an_unregistered_target_errors() {
    let f = Fixture::new();
    let stranger = Address::generate(&f.env);

    assert_eq!(
        f.gate
            .try_propose_upgrade(&stranger, &f.hash(1), &f.approver(0)),
        Err(Ok(Error::TargetNotRegistered))
    );
}

// --- proposing ------------------------------------------------------------

#[test]
fn proposal_ids_increment_per_target() {
    let f = Fixture::new();
    assert_eq!(f.propose(1), 1);
    assert_eq!(f.propose(2), 2);
}

#[test]
fn only_an_approver_may_propose() {
    let f = Fixture::new();
    let outsider = Address::generate(&f.env);

    // A gate anyone can queue proposals against is a spam surface.
    assert_eq!(
        f.gate.try_propose_upgrade(&f.target, &f.hash(1), &outsider),
        Err(Ok(Error::NotAnApprover))
    );
}

// --- approving ------------------------------------------------------------

#[test]
fn the_proposer_cannot_approve_their_own_proposal() {
    let f = Fixture::new();
    let id = f.propose(1);

    assert_eq!(
        f.gate.try_approve(&f.target, &id, &f.approver(0)),
        Err(Ok(Error::SelfApproval))
    );
}

#[test]
fn an_approver_cannot_approve_twice() {
    let f = Fixture::new();
    let id = f.propose(1);

    f.gate.approve(&f.target, &id, &f.approver(1));
    assert_eq!(
        f.gate.try_approve(&f.target, &id, &f.approver(1)),
        Err(Ok(Error::AlreadyApproved))
    );
}

#[test]
fn an_outsider_cannot_approve() {
    let f = Fixture::new();
    let id = f.propose(1);
    let outsider = Address::generate(&f.env);

    assert_eq!(
        f.gate.try_approve(&f.target, &id, &outsider),
        Err(Ok(Error::NotAnApprover))
    );
}

#[test]
#[should_panic]
fn approve_requires_the_approver_to_sign() {
    let f = Fixture::new();
    let id = f.propose(1);

    // A row in a database can be written by anyone with the connection string.
    // An approval cannot.
    f.env.set_auths(&[]);
    f.gate.approve(&f.target, &id, &f.approver(1));
}

#[test]
fn status_becomes_approved_only_at_the_threshold() {
    let f = Fixture::new();
    let id = f.propose(1);

    assert_eq!(
        f.gate.get_proposal(&f.target, &id).status,
        ProposalStatus::Open
    );

    f.gate.approve(&f.target, &id, &f.approver(1));
    assert_eq!(
        f.gate.get_proposal(&f.target, &id).status,
        ProposalStatus::Open
    );

    f.gate.approve(&f.target, &id, &f.approver(2));
    assert_eq!(
        f.gate.get_proposal(&f.target, &id).status,
        ProposalStatus::Approved
    );
}

// --- executing ------------------------------------------------------------

#[test]
fn execute_below_the_threshold_is_refused() {
    let f = Fixture::new();
    let id = f.propose(1);
    f.gate.approve(&f.target, &id, &f.approver(1));

    assert_eq!(
        f.gate.try_execute(&f.target, &id),
        Err(Ok(Error::ThresholdNotMet))
    );
    assert_eq!(f.target_client.applied(), None);
}

#[test]
fn the_happy_path_upgrades_the_target() {
    let f = Fixture::new();
    let id = f.propose(7);

    f.gate.approve(&f.target, &id, &f.approver(1));
    f.gate.approve(&f.target, &id, &f.approver(2));
    f.gate.execute(&f.target, &id);

    // The cross-contract call landed: the target applied the proposed hash, and
    // it only accepts that call from the gate.
    assert_eq!(f.target_client.applied(), Some(f.hash(7)));
    assert_eq!(
        f.gate.get_proposal(&f.target, &id).status,
        ProposalStatus::Executed
    );
}

#[test]
fn executed_is_terminal() {
    let f = Fixture::new();
    let id = f.propose(1);
    f.gate.approve(&f.target, &id, &f.approver(1));
    f.gate.approve(&f.target, &id, &f.approver(2));
    f.gate.execute(&f.target, &id);

    assert_eq!(
        f.gate.try_execute(&f.target, &id),
        Err(Ok(Error::ProposalClosed))
    );
    assert_eq!(
        f.gate.try_approve(&f.target, &id, &f.approver(1)),
        Err(Ok(Error::ProposalClosed))
    );
}

#[test]
#[should_panic]
fn the_target_refuses_an_upgrade_that_did_not_come_through_the_gate() {
    let f = Fixture::new();
    f.env.set_auths(&[]);

    // Calling the target directly cannot satisfy `gate.require_auth()`. This is
    // why the gate has to be a contract: a database cannot sign for this.
    f.target_client.upgrade(&f.hash(9));
}

// --- rejecting ------------------------------------------------------------

#[test]
fn one_rejection_kills_the_proposal() {
    let f = Fixture::new();
    let id = f.propose(1);
    f.gate.approve(&f.target, &id, &f.approver(1));

    f.gate
        .reject(&f.target, &id, &f.approver(2), &f.reason("fails the audit"));

    let proposal = f.gate.get_proposal(&f.target, &id);
    assert_eq!(proposal.status, ProposalStatus::Rejected);
    assert_eq!(proposal.rejected_by, Some(f.approver(2)));
    assert_eq!(proposal.rejected_reason, Some(f.reason("fails the audit")));

    assert_eq!(
        f.gate.try_approve(&f.target, &id, &f.approver(1)),
        Err(Ok(Error::ProposalClosed))
    );
    assert_eq!(
        f.gate.try_execute(&f.target, &id),
        Err(Ok(Error::ProposalClosed))
    );
}

#[test]
fn the_proposer_may_withdraw_by_rejecting() {
    let f = Fixture::new();
    let id = f.propose(1);

    f.gate.reject(
        &f.target,
        &id,
        &f.approver(0),
        &f.reason("superseded, will resubmit"),
    );
    assert_eq!(
        f.gate.get_proposal(&f.target, &id).status,
        ProposalStatus::Rejected
    );
}

#[test]
fn a_rejection_reason_is_mandatory() {
    let f = Fixture::new();
    let id = f.propose(1);

    // Empty is refused: a terminal refusal that explains nothing is the exact
    // frustration this field exists to answer.
    assert_eq!(
        f.gate
            .try_reject(&f.target, &id, &f.approver(2), &f.reason("")),
        Err(Ok(Error::InvalidReason))
    );
    // And the proposal is untouched — a refused reject does not settle it.
    assert_eq!(
        f.gate.get_proposal(&f.target, &id).status,
        ProposalStatus::Open
    );
}

#[test]
fn an_oversized_rejection_reason_is_refused() {
    let f = Fixture::new();
    let id = f.propose(1);

    // 281 bytes — one past MAX_REASON_LEN, so a reason cannot be used to bloat
    // contract storage.
    let long: std::string::String = "x".repeat(281);
    assert_eq!(
        f.gate
            .try_reject(&f.target, &id, &f.approver(2), &f.reason(&long)),
        Err(Ok(Error::InvalidReason))
    );
}

// --- expiry ---------------------------------------------------------------

#[test]
fn a_stale_proposal_cannot_be_cashed_in_later() {
    let f = Fixture::new();
    let id = f.propose(1);
    f.gate.approve(&f.target, &id, &f.approver(1));

    f.env.ledger().with_mut(|ledger| {
        ledger.sequence_number += PROPOSAL_LIFETIME_LEDGERS + 1;
    });

    // The approver signed for a decision, not for a standing permission.
    assert_eq!(
        f.gate.try_approve(&f.target, &id, &f.approver(2)),
        Err(Ok(Error::ProposalExpired))
    );
    assert_eq!(
        f.gate.try_execute(&f.target, &id),
        Err(Ok(Error::ProposalExpired))
    );
    assert_eq!(
        f.gate.get_proposal(&f.target, &id).status,
        ProposalStatus::Expired
    );
}

#[test]
fn an_expired_proposal_never_reaches_approved() {
    let f = Fixture::new();
    let id = f.propose(1);
    f.gate.approve(&f.target, &id, &f.approver(1));
    f.gate.approve(&f.target, &id, &f.approver(2));

    f.env.ledger().with_mut(|ledger| {
        ledger.sequence_number += PROPOSAL_LIFETIME_LEDGERS + 1;
    });

    // Expiry wins over a met threshold: it is not executable, so it must not
    // read as approved.
    assert_eq!(
        f.gate.get_proposal(&f.target, &id).status,
        ProposalStatus::Expired
    );
}

// --- changing the approver set --------------------------------------------

#[test]
fn changing_the_set_needs_the_current_threshold() {
    let f = Fixture::new();
    let replacement = vec![
        &f.env,
        f.approver(0),
        f.approver(1),
        Address::generate(&f.env),
    ];

    // One signature is not enough when the threshold is two — otherwise the
    // gate is bypassed by adding yourself.
    assert_eq!(
        f.gate
            .try_set_approvers(&f.target, &replacement, &2, &vec![&f.env, f.approver(0)]),
        Err(Ok(Error::ThresholdNotMet))
    );

    f.gate.set_approvers(
        &f.target,
        &replacement,
        &2,
        &vec![&f.env, f.approver(0), f.approver(1)],
    );
    assert_eq!(f.gate.get_target(&f.target).approvers, replacement);
}

#[test]
fn the_same_signer_cannot_be_counted_twice() {
    let f = Fixture::new();
    let replacement = vec![
        &f.env,
        f.approver(0),
        f.approver(1),
        Address::generate(&f.env),
    ];

    assert_eq!(
        f.gate.try_set_approvers(
            &f.target,
            &replacement,
            &2,
            &vec![&f.env, f.approver(0), f.approver(0)]
        ),
        Err(Ok(Error::AlreadyApproved))
    );
}

#[test]
fn an_outsider_cannot_sign_for_a_set_change() {
    let f = Fixture::new();
    let outsider = Address::generate(&f.env);

    assert_eq!(
        f.gate.try_set_approvers(
            &f.target,
            &vec![&f.env, f.approver(0), f.approver(1), outsider.clone()],
            &2,
            &vec![&f.env, f.approver(0), outsider]
        ),
        Err(Ok(Error::NotAnApprover))
    );
}

#[test]
fn removing_an_approver_retires_the_approval_they_already_gave() {
    let f = Fixture::new();
    let id = f.propose(1);
    f.gate.approve(&f.target, &id, &f.approver(1));
    f.gate.approve(&f.target, &id, &f.approver(2));
    assert_eq!(
        f.gate.get_proposal(&f.target, &id).status,
        ProposalStatus::Approved
    );

    // Drop approver 2 from the set. Their signature is still recorded — the
    // history is permanent — but it no longer counts toward the threshold, so
    // removing someone takes effect immediately rather than after the proposals
    // they touched have drained.
    f.gate.set_approvers(
        &f.target,
        &vec![
            &f.env,
            f.approver(0),
            f.approver(1),
            Address::generate(&f.env),
        ],
        &2,
        &vec![&f.env, f.approver(0), f.approver(1)],
    );

    let proposal = f.gate.get_proposal(&f.target, &id);
    assert_eq!(proposal.approvals.len(), 2);
    assert_eq!(proposal.status, ProposalStatus::Open);
    assert_eq!(
        f.gate.try_execute(&f.target, &id),
        Err(Ok(Error::ThresholdNotMet))
    );
}

// --- events ---------------------------------------------------------------

/// `env.events()` reports the most recent invocation rather than accumulating,
/// so each write is checked immediately after it happens. That is the stronger
/// assertion anyway: it pins the event to the call that caused it.
#[test]
fn every_write_emits_its_event() {
    let f = Fixture::new();
    assert_eq!(f.env.events().all().events().len(), 1, "registered");

    let id = f.propose(3);
    assert_eq!(f.env.events().all().events().len(), 1, "proposed");

    f.gate.approve(&f.target, &id, &f.approver(1));
    assert_eq!(f.env.events().all().events().len(), 1, "approved");

    f.gate.reject(
        &f.target,
        &id,
        &f.approver(2),
        &f.reason("blocks the release"),
    );
    assert_eq!(f.env.events().all().events().len(), 1, "rejected");

    let next = f.propose(4);
    f.gate.approve(&f.target, &next, &f.approver(1));
    f.gate.approve(&f.target, &next, &f.approver(2));
    f.gate.execute(&f.target, &next);
    assert_eq!(f.env.events().all().events().len(), 1, "executed");
}

#[test]
fn a_refused_call_emits_nothing() {
    let f = Fixture::new();
    let id = f.propose(1);

    // A self-approval and an under-threshold execute both fail, and neither may
    // leave a trace that suggests otherwise.
    let _ = f.gate.try_approve(&f.target, &id, &f.approver(0));
    assert_eq!(f.env.events().all().events().len(), 0);

    let _ = f.gate.try_execute(&f.target, &id);
    assert_eq!(f.env.events().all().events().len(), 0);
}

#[test]
fn a_missing_proposal_errors() {
    let f = Fixture::new();
    assert_eq!(
        f.gate.try_get_proposal(&f.target, &99),
        Err(Ok(Error::ProposalNotFound))
    );
}
