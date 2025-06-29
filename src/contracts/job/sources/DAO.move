module job_work_board::dao_vote {
    use std::signer;
    use std::vector;
    use std::string;
    use std::simple_map::{Self, SimpleMap};
    use std::timestamp;
    use std::event;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account::{Self};
    use job_work_board::job_marketplace_v29;
    use did_addr_profile::web3_profiles_v29;

    const E_ALREADY_VOTED: u64 = 1;
    const E_INVALID_CANDIDATE: u64 = 2;
    const E_VOTE_CLOSED: u64 = 3;
    const E_TOO_EARLY: u64 = 4;
    const E_ALREADY_RESOLVED: u64 = 5;
    const E_DISPUTE_EXISTS: u64 = 6;
    const E_DISPUTE_NOT_FOUND: u64 = 7;
    const E_UNAUTHORIZED: u64 = 8;
    const E_MODULE_NOT_INITIALIZED: u64 = 9;
    const E_NOT_ENOUGH_TRUST_SCORE: u64 = 10;
    const E_NOT_ENOUGH_COMPLETED_JOBS: u64 = 11;

    const DAO_STORAGE: address = @dao_addr;

    struct CandidateInfo has store{
        vote_counts: SimpleMap<address, u64>,
        client_address: address,
        freelancer_address: address,
        winning_address: address,
        description: string::String,
        document_link: string::String,
        voting_deadline: u64,
        is_resolved: bool,
        job_index: u64,
        milestone_index: u64,
        creator: address
    }

    struct VoterInfo has store, copy, drop {
        client_vote_wallets: vector<address>,
        freelancer_vote_wallets: vector<address>,
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
        dispute_resolved_event: event::EventHandle<DisputeResolvedEvent>,
        dispute_counter: u64,
    }

    public entry fun init(admin: signer) {
        assert!(!exists<AllDisputes>(DAO_STORAGE), E_DISPUTE_EXISTS);
        assert!(signer::address_of(&admin) == DAO_STORAGE, E_UNAUTHORIZED);

        let vote_closed_event = account::new_event_handle<VoteClosedEvent>(&admin);
        let dispute_resolved_event = account::new_event_handle<DisputeResolvedEvent>(&admin);

        let all_disputes = AllDisputes {
            sessions: simple_map::create(),
            vote_closed_event,
            dispute_resolved_event,
            dispute_counter: 0
        };

        move_to(&admin, all_disputes);
    }

    struct CandidateInfoView has copy, drop {
        client_address: address,
        freelancer_address: address,
        winning_address: address,
        description: string::String,
        document_link: string::String,
        voting_deadline: u64,
        is_resolved: bool,
        job_index: u64,
        milestone_index: u64,
        creator: address
    }

    struct DisputeSessionView has copy, drop {
        client_address: address,
        freelancer_address: address,
        winning_address: address,
        description: string::String,
        document_link: string::String,
        voting_deadline: u64,
        is_resolved: bool,
        job_index: u64,
        milestone_index: u64,
        creator: address,

        client_vote_wallets: vector<address>,
        freelancer_vote_wallets: vector<address>,
    }


    #[view]
    public fun get_dispute_info(dispute_id: u64): CandidateInfoView acquires AllDisputes {
        let all_disputes = borrow_global<AllDisputes>(DAO_STORAGE);
        assert!(simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_NOT_FOUND);
        let session = simple_map::borrow(&all_disputes.sessions, &dispute_id);
        let c = &session.candidates;

        CandidateInfoView {
            client_address: c.client_address,
            freelancer_address: c.freelancer_address,
            winning_address: c.winning_address,
            description: c.description,
            document_link: c.document_link,
            voting_deadline: c.voting_deadline,
            is_resolved: c.is_resolved,
            job_index: c.job_index,
            milestone_index: c.milestone_index,
            creator: c.creator
        }
    }


    #[view]
    public fun get_all_dispute_ids(): vector<u64> acquires AllDisputes {
        let all_disputes = borrow_global<AllDisputes>(DAO_STORAGE);
        simple_map::keys(&all_disputes.sessions)
    }

    #[view]
    public fun get_dispute_full(dispute_id: u64): DisputeSessionView acquires AllDisputes {
        let all_disputes = borrow_global<AllDisputes>(DAO_STORAGE);
        assert!(simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_NOT_FOUND);
        let session = simple_map::borrow(&all_disputes.sessions, &dispute_id);
        let c = &session.candidates;
        let v = &session.voters;

        DisputeSessionView {
            client_address: c.client_address,
            freelancer_address: c.freelancer_address,
            winning_address: c.winning_address,
            description: c.description,
            document_link: c.document_link,
            voting_deadline: c.voting_deadline,
            is_resolved: c.is_resolved,
            job_index: c.job_index,
            milestone_index: c.milestone_index,
            creator: c.creator,

            client_vote_wallets: v.client_vote_wallets,
            freelancer_vote_wallets: v.freelancer_vote_wallets
        }
    }

    public entry fun open_dispute_vote(
        creator: signer,
        freelancer: address,
        client: address,
        job_index: u64,
        milestone_index: u64,
        description: string::String,
        document_link: string::String
    ) acquires AllDisputes {
        let all_disputes = borrow_global_mut<AllDisputes>(DAO_STORAGE);

        let dispute_id = all_disputes.dispute_counter;
        all_disputes.dispute_counter = dispute_id + 1;

        let deadline = timestamp::now_seconds() + 604800;

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
            milestone_index,
            creator: signer::address_of(&creator),
            description: description,
            document_link: document_link
        };

        let dispute_session = DisputeSession {
            candidates: candidate_info,
            voters: VoterInfo {
                client_vote_wallets: vector::empty<address>(),
                freelancer_vote_wallets: vector::empty<address>()
            }
        };

        simple_map::add(&mut all_disputes.sessions, dispute_id, dispute_session);
    }

    fun has_voted(wallets: &vector<address>, addr: address): bool {
        let i = 0;
        let len = vector::length(wallets);
        while (i < len) {
            if (*vector::borrow(wallets, i) == addr) {
                return true;
            };
            i = i + 1;
        };
        false
    }

    fun has_voted_any(voter: address, voters: &VoterInfo): bool {
        has_voted(&voters.client_vote_wallets, voter) || has_voted(&voters.freelancer_vote_wallets, voter)
    }

    public entry fun vote(
        voter: signer,
        dispute_id: u64,
        selected_candidate: address
    ) acquires AllDisputes {
        let voter_addr = signer::address_of(&voter);
        let all_disputes = borrow_global_mut<AllDisputes>(DAO_STORAGE);
        assert!(simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_NOT_FOUND);

        let trust_score = web3_profiles_v29::get_trust_score_by_address(voter_addr);
        assert!(trust_score >= 80, E_NOT_ENOUGH_TRUST_SCORE);

        let count_job = job_marketplace_v29::count_completed_jobs(voter_addr);
        assert!(count_job > 0, E_NOT_ENOUGH_COMPLETED_JOBS);

        let session = simple_map::borrow_mut(&mut all_disputes.sessions, &dispute_id);
        let current_time = timestamp::now_seconds();

        assert!(current_time < session.candidates.voting_deadline, E_VOTE_CLOSED);
        assert!(!has_voted_any(voter_addr, &session.voters), E_ALREADY_VOTED);
        assert!(simple_map::contains_key(&session.candidates.vote_counts, &selected_candidate), E_INVALID_CANDIDATE);

        let vote_counter = simple_map::borrow_mut(&mut session.candidates.vote_counts, &selected_candidate);
        *vote_counter = *vote_counter + 1;

        if (selected_candidate == session.candidates.client_address) {
            vector::push_back(&mut session.voters.client_vote_wallets, voter_addr);
        } else {
            vector::push_back(&mut session.voters.freelancer_vote_wallets, voter_addr);
        }
    }


    public entry fun resolve_dispute_and_close_vote(user: signer,dispute_id: u64) acquires AllDisputes {
        let user_addr = signer::address_of(&user);
        let all_disputes = borrow_global_mut<AllDisputes>(DAO_STORAGE);

        assert!(simple_map::contains_key(&all_disputes.sessions, &dispute_id), E_DISPUTE_NOT_FOUND);
        let session = simple_map::borrow_mut(&mut all_disputes.sessions, &dispute_id);

        assert!(user_addr == session.candidates.creator, E_UNAUTHORIZED);
        assert!(!session.candidates.is_resolved, E_ALREADY_RESOLVED);

        let current_time = timestamp::now_seconds();

        let client_votes = simple_map::borrow(&session.candidates.vote_counts, &session.candidates.client_address);
        let freelancer_votes = simple_map::borrow(&session.candidates.vote_counts, &session.candidates.freelancer_address);

        if (*client_votes > *freelancer_votes) {
            session.candidates.winning_address = session.candidates.client_address;
        } else {
            session.candidates.winning_address = session.candidates.freelancer_address;
        };

        let  all_wallets = session.voters.client_vote_wallets;
        vector::append(&mut all_wallets, session.voters.freelancer_vote_wallets);

        let len = vector::length(&all_wallets);
        let i = 0;
        while (i < len) {
            let addr = *vector::borrow(&all_wallets, i);
            if(web3_profiles_v29::has_profile(addr)){
                web3_profiles_v29::increase_trust_score_from_vote(addr);
            };
            i = i + 1;
        };

        let winner = session.candidates.winning_address;
        assert!(
            winner == session.candidates.client_address || winner == session.candidates.freelancer_address,
            E_INVALID_CANDIDATE
        );

        if (winner == session.candidates.freelancer_address) {
            let milestones = job_marketplace_v29::get_job_milestones(
                session.candidates.job_index
            );
            assert!(session.candidates.milestone_index < vector::length(&milestones), 999);
            let amount = *vector::borrow(&milestones, session.candidates.milestone_index);

            job_marketplace_v29::transfer_from_escrow(winner, amount);

            web3_profiles_v29::update_trust_score_from_vote(
                session.candidates.freelancer_address,
                session.candidates.client_address,
                false
            );
        };


        session.candidates.is_resolved = true;
      
        event::emit_event(
            &mut all_disputes.vote_closed_event,
            VoteClosedEvent {
                dispute_id,
                winner,
                time: current_time
            }
        );

        event::emit_event(
            &mut all_disputes.dispute_resolved_event,
            DisputeResolvedEvent {
                dispute_id,
                winner,
                resolved_by: user_addr,
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
