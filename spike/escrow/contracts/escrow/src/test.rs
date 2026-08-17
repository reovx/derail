#![cfg(test)]

use super::{Error, Escrow, EscrowClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env,
};

const START_LEDGER: u32 = 1000;
const START_TIME: u64 = 1_700_000_000;

struct Fixture {
    env: Env,
    client: EscrowClient<'static>,
    beneficiary: Address,
}

fn setup(deadline: u64) -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(START_LEDGER);
    env.ledger().set_timestamp(START_TIME);

    let contract_id = env.register(Escrow, ());
    let client = EscrowClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    client.initialize(&admin, &beneficiary, &deadline);

    Fixture {
        env,
        client,
        beneficiary,
    }
}

#[test]
fn initialize_is_one_shot() {
    let f = setup(START_TIME + 3600);
    let other = Address::generate(&f.env);

    let err = f
        .client
        .try_initialize(&other, &f.beneficiary, &(START_TIME + 3600))
        .unwrap_err()
        .unwrap();

    assert_eq!(err, Error::AlreadyInitialized);
}

#[test]
fn release_succeeds_inside_the_window() {
    let f = setup(START_TIME + 3600);

    // Guard well ahead of the current ledger: the tx would land in time.
    let at = f.client.release(&(START_LEDGER + 100));

    assert_eq!(at, START_LEDGER);
    assert_eq!(f.client.status(), Some(START_LEDGER));
}

/// The behaviour the whole spike hangs on.
///
/// Simulation reads ledger N and the guard holds. The tx is then included in a
/// later ledger, where the same guard rejects it. Here we model that by
/// advancing the ledger between the caller's assertion and execution.
#[test]
fn release_expires_when_the_tx_lands_a_ledger_late() {
    let f = setup(START_TIME + 3600);

    // What the caller simulated against.
    let simulated_at = f.env.ledger().sequence();

    // The chain moves on before the tx is included.
    f.env.ledger().set_sequence_number(simulated_at + 1);

    let err = f.client.try_release(&simulated_at).unwrap_err().unwrap();

    assert_eq!(err, Error::Expired);
    assert_eq!(f.client.status(), None, "a failed release must not mutate state");
}

#[test]
fn release_rejects_a_passed_wall_clock_deadline() {
    let f = setup(START_TIME + 60);

    f.env.ledger().set_timestamp(START_TIME + 61);

    let err = f
        .client
        .try_release(&(START_LEDGER + 100))
        .unwrap_err()
        .unwrap();

    assert_eq!(err, Error::DeadlinePassed);
}

#[test]
fn release_is_one_shot() {
    let f = setup(START_TIME + 3600);
    f.client.release(&(START_LEDGER + 100));

    let err = f
        .client
        .try_release(&(START_LEDGER + 100))
        .unwrap_err()
        .unwrap();

    assert_eq!(err, Error::AlreadyReleased);
}
