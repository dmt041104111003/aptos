module work_board::DAO {
    use std::signer;
    use std::vector;
    use std::simple_map::{Self, SimpleMap};
    use std::timestamp;
    use std::event;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account::{Self};
    use work_board::job_marketplace_v17;

    const E_ALREADY_VOTED: u64 = 1;
    const E_INVALID_CANDIDATE: u64 = 2;
    const E_VOTE_CLOSED: u64 = 3;
    const E_TOO_EARLY: u64 = 4;
    const E_ALREADY_RESOLVED: u64 = 5;
    const E_DISPUTE_EXISTS: u64 = 6;
    const E_DISPUTE_NOT_FOUND: u64 = 7;
    const E_UNAUTHORIZED: u64 = 8;

    const DAO_STORAGE: address = @dao_addr;

    struct CandidateInfo has store {
        vote_counts: SimpleMap<address, u64>,
        client_address: address,
        freelancer_address: address,
        winning_address: address,
        voting_deadline: u64,
        is_resolved: bool,
        job_index: u64,
        milestone_index: u64
    }

    struct VoterInfo has store, copy, drop {
        voted_wallets: vector<address>
    }

    struct DisputeSession has store {
        candidates: CandidateInfo,
        voters: VoterInfo
    }

    struct VoteClosedEvent has copy, drop, store {
        dispute_id: u64,
        winner: address,
        time: u64
    }

    struct DisputeResolvedEvent has copy, drop, store {
        dispute_id: u64,
        winner: address,
        resolved_by: address,
        time: u64
    }

    struct AllDisputes has key {
        sessions: SimpleMap<u64, DisputeSession>,
        vote_closed_event: event::EventHandle<VoteClosedEvent>,
        dispute_resolved_event: event::EventHandle<DisputeResolvedEvent>
    }

    public entry fun init(admin: signer) {
        assert!(!exists<AllDisputes>(DAO_STORAGE), E_DISPUTE_EXISTS);
        assert!(signer::address_of(&admin) == DAO_STORAGE,E_UNAUTHORIZED);

        let vote_closed_event = account::new_event_handle<VoteClosedEvent>(&admin);
        let dispute_resolved_event = account::new_event_handle<DisputeResolvedEvent>(&admin);

        let all_disputes = AllDisputes {
            sessions: simple_map::create(),
            vote_closed_event,
            dispute_resolved_event,
        };

        move_to(&admin, all_disputes);
    }

    #[view]
    public fun get_dispute_info(dispute_id: u64): CandidateInfo acquires AllDisputes {
        let all_disputes = borrow_global<AllDisputes>(DAO_STORAGE);
        let session = simple_map::borrow(&all_disputes.sessions, &dispute_id);
        CandidateInfo {
            vote_counts: session.candidates.vote_counts,
            client_address: session.candidates.client_address,
            freelancer_address: session.candidates.freelancer_address,
            winning_address: session.candidates.winning_address,
            voting_deadline: session.candidates.voting_deadline,
            is_resolved: session.candidates.is_resolved,
            job_index: session.candidates.job_index,
            milestone_index: session.candidates.milestone_index
            
        }
        
    }

    #[view]
    public  fun get_all_dispute_ids(): vector<u64> acquires AllDisputes {
        let all_disputes = borrow_global<AllDisputes>(DAO_STORAGE);
        simple_map::keys(&all_disputes.sessions)
    }

    public entry fun open_dispute_vote(
        creator: signer,
        dispute_id: u64,
        freelancer: address,
        client: address,
        voting_duration: u64,
        job_index: u64,
        milestone_index: u64,
    ) acquires AllDisputes {
        let all_disputes = borrow_global_mut<AllDisputes>(DAO_STORAGE);
        assert!(!simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_EXISTS);

        let deadline = timestamp::now_seconds() + voting_duration;

        let vote_counts = simple_map::create();
        simple_map::add(&mut vote_counts, freelancer, 0);
        simple_map::add(&mut vote_counts, client, 0);

        let candidate_info = CandidateInfo {
            vote_counts,
            client_address: client,
            freelancer_address: freelancer,
            winning_address: @0x0,
            voting_deadline: deadline,
            is_resolved: false,
            job_index,
            milestone_index
        };

        let dispute_session = DisputeSession {
            candidates: candidate_info,
            voters: VoterInfo {
                voted_wallets: vector::empty<address>()
            }
        };

        simple_map::add(&mut all_disputes.sessions, dispute_id, dispute_session);
    }

    fun has_voted(voted_wallets: &vector<address>, addr: address): bool {
        let len = vector::length(voted_wallets);
        let i = 0;
        while (i < len) {
            if (*vector::borrow(voted_wallets, i) == addr) {
                return true;
            };
            i = i + 1;
        };
        false
    }

    public entry fun vote(
        voter: signer,
        dispute_id: u64,
        selected_candidate: address
    ) acquires AllDisputes {
        let voter_addr = signer::address_of(&voter);
        let all_disputes = borrow_global_mut<AllDisputes>(DAO_STORAGE);
        assert!(simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_NOT_FOUND);

        let session = simple_map::borrow_mut(&mut all_disputes.sessions, &dispute_id);
        let current_time = timestamp::now_seconds();

        assert!(current_time < session.candidates.voting_deadline, E_VOTE_CLOSED);
        assert!(!has_voted(&session.voters.voted_wallets, voter_addr), E_ALREADY_VOTED);
        assert!(simple_map::contains_key(&session.candidates.vote_counts, &selected_candidate), E_INVALID_CANDIDATE);

        let vote_counter = simple_map::borrow_mut(&mut session.candidates.vote_counts, &selected_candidate);
        *vote_counter = *vote_counter + 1;

        vector::push_back(&mut session.voters.voted_wallets, voter_addr);
    }

    public entry fun close_vote(dispute_id: u64) acquires AllDisputes {
        let all_disputes = borrow_global_mut<AllDisputes>(DAO_STORAGE);
        assert!(simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_NOT_FOUND);

        let session = simple_map::borrow_mut(&mut all_disputes.sessions, &dispute_id);
        let current_time = timestamp::now_seconds();

        assert!(current_time >= session.candidates.voting_deadline, E_TOO_EARLY);
        assert!(!session.candidates.is_resolved, E_ALREADY_RESOLVED);

        let client_votes = simple_map::borrow(&session.candidates.vote_counts, &session.candidates.client_address);
        let freelancer_votes = simple_map::borrow(&session.candidates.vote_counts, &session.candidates.freelancer_address);

        if (*client_votes > *freelancer_votes) {
            session.candidates.winning_address = session.candidates.client_address;
        } else {
            session.candidates.winning_address = session.candidates.freelancer_address;
        };

        event::emit_event(
            &mut all_disputes.vote_closed_event,
            VoteClosedEvent {
                dispute_id,
                winner: session.candidates.winning_address,
                time: current_time
            }
        );
    }

    public entry fun dispute_resolution(admin: signer,dispute_id: u64) acquires AllDisputes {
        let admin_addr = signer::address_of(&admin);
        let all_disputes = borrow_global_mut<AllDisputes>(DAO_STORAGE);
        assert!(simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_NOT_FOUND);

        let session = simple_map::borrow_mut(&mut all_disputes.sessions, &dispute_id);
        let current_time = timestamp::now_seconds();

        assert!(admin_addr == DAO_STORAGE, E_UNAUTHORIZED);

        assert!(current_time >= session.candidates.voting_deadline, E_TOO_EARLY);
        assert!(!session.candidates.is_resolved, E_ALREADY_RESOLVED);
        

        let winner = session.candidates.winning_address;
        assert!(
            winner == session.candidates.client_address || winner == session.candidates.freelancer_address,
            E_INVALID_CANDIDATE
        );

        

        if (winner == session.candidates.freelancer_address) {
            let milestones = job_marketplace_v17::get_job_milestones(
                admin_addr,
                session.candidates.job_index
            );

            assert!(session.candidates.milestone_index < vector::length(&milestones), 999);
            let amount = *vector::borrow(&milestones, session.candidates.milestone_index);

            coin::transfer<AptosCoin>(&admin, winner, amount);
        };

        session.candidates.is_resolved = true;

        event::emit_event(
            &mut all_disputes.dispute_resolved_event,
            DisputeResolvedEvent {
                dispute_id,
                winner,
                resolved_by: admin_addr,
                time: current_time
            }
        );
    }

    public fun get_winner(dispute_id: u64): address acquires AllDisputes {
        let all_disputes = borrow_global<AllDisputes>(DAO_STORAGE);
        assert!(simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_NOT_FOUND);
        let session = simple_map::borrow(&all_disputes.sessions, &dispute_id);
        session.candidates.winning_address
    }

    public fun is_resolved(dispute_id: u64): bool acquires AllDisputes {
        let all_disputes = borrow_global<AllDisputes>(DAO_STORAGE);
        assert!(simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_NOT_FOUND);
        let session = simple_map::borrow(&all_disputes.sessions, &dispute_id);
        session.candidates.is_resolved
    }
}
