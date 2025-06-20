module job_work_board::job_marketplace_v29 {
    use std::option::{Self, Option};
   
    use std::signer;
    use aptos_framework::coin::{Self};
    use aptos_framework::aptos_coin::AptosCoin;
    use std::table;
    use std::event;
    use aptos_framework::account::{Self, SignerCapability};
    use std::vector;
    use aptos_framework::timestamp;
    use did_addr_profile::web3_profiles_v29;

    const EJOB_NOT_FOUND: u64 = 0;
    const EALREADY_HAS_WORKER: u64 = 1;
    const ENOT_POSTER: u64 = 2;
    const ENOT_IN_APPLY_TIME: u64 = 3;
    const ENOT_ACTIVE: u64 = 4;
    const ENOT_WORKER: u64 = 5;
    const EALREADY_SUBMITTED: u64 = 6;
    const ENOT_SUBMITTED: u64 = 7;
    const ENOT_READY_TO_AUTO_CONFIRM: u64 = 8;
    const ENOT_SUBMITTING_WORKER: u64 = 9;
    const EALREADY_REJECTED: u64 = 10;
    const EWORKER_NOT_APPLIED: u64 = 11;
    const ENOT_APPROVED: u64 = 12;
    const ENOT_REJECTABLE: u64 = 13;
    const ENOT_CANCELABLE: u64 = 14;
    const EALREADY_APPLIED: u64 = 15;
    const EREJECT_LIMIT_REACHED: u64 = 16;
    const ENOT_SELECTED: u64 = 17;
    const EINVALID_MILESTONE: u64 = 18;
    const EINVALID_TIMING: u64 = 19;
    const ETOO_MANY_REJECTIONS: u64 = 20;
    const EMODULE_NOT_INITIALIZED: u64 = 21;
    const EINVALID_PROFILE: u64 = 22;
    const EINVALID_DID: u64 = 23;
    const EINSUFFICIENT_FUNDS: u64 = 24;
    const EINVALID_AMOUNT: u64 = 25;
    const EINVALID_SIGNER_FOR_INIT: u64 = 26;
    const ENOT_READY_TO_REOPEN: u64 = 27;
    const EAPPLICATION_DEADLINE_PASSED: u64 = 28;
    const ENOT_AUTHORIZED: u64 = 29;
    const ETOO_EARLY_AUTO_CONFIRM: u64 = 30;
    const ENO_PROFILE: u64 = 31;
    const EINVALID_CID: u64 = 32;
    const EWITHDRAW_REQUEST_PENDING: u64 = 1003;
    const ECANCEL_REQUEST_PENDING: u64 = 3006;
    const EEXPIRE_WHEN_APPROVED_WORKER: u64 = 2001;
    const EREMOVE_WORKER_INVALID: u64 = 2002;
    const EREMOVE_WORKER_NOT_EXPIRED: u64 = 2003;
    const EREMOVE_WORKER_ALREADY_SUBMITTED: u64 = 2004;

    const APPLY_FEE: u64 = 100_000_000;
    const MAX_REJECTIONS: u8 = 3;
    const ONE_APT: u64 = 100_000_000;

    const EVENT_JOB_POSTED: u8 = 1;
    const EVENT_WORKER_APPROVED: u8 = 2;
    const EVENT_MILESTONE_SUBMITTED: u8 = 3;
    const EVENT_MILESTONE_ACCEPTED: u8 = 4;
    const EVENT_MILESTONE_REJECTED: u8 = 5;
    const EVENT_JOB_CANCELED: u8 = 7;
    const EVENT_JOB_COMPLETED: u8 = 8;

    const INTEREST_RATE_PER_HOUR: u64 = 50; 
    const INTEREST_RATE_DENOM: u64 = 100; 
    const WORKER_INTEREST_SHARE: u64 = 5; 
    const PLATFORM_INTEREST_SHARE: u64 = 1; 
    const INTEREST_SHARE_DENOM: u64 = 6;
    const PLATFORM_ADDRESS: address = @job_work_board;

    struct MilestoneData has copy, drop, store {
        submitted: bool,
        accepted: bool,
        submit_time: u64,
        reject_count: u8,
        submission_cid: vector<u8>,
        acceptance_cid: vector<u8>,
        rejection_cid: vector<u8>,
    }

    struct FundFlowEvent has copy, drop, store {
        job_id: u64,
        to: address,
        amount: u64,
        time: u64
    }

    struct WithdrawRequestedEvent has copy, drop, store {
        job_id: u64,
        worker: address,
        time: u64
    }

    struct WithdrawApprovedEvent has copy, drop, store {
        job_id: u64,
        worker: address,
        poster: address,
        time: u64,
        worker_amount: u64,
        poster_amount: u64,
        escrow_amount: u64
    }

    struct WithdrawDeniedEvent has copy, drop, store {
        job_id: u64,
        worker: address,
        poster: address,
        time: u64
    }

    struct CancelRequestedEvent has copy, drop, store {
        job_id: u64,
        poster: address,
        worker: address,
        time: u64
    }

    struct CancelApprovedEvent has copy, drop, store {
        job_id: u64,
        poster: address,
        worker: address,
        time: u64
    }

    struct CancelDeniedEvent has copy, drop, store {
        job_id: u64,
        poster: address,
        worker: address,
        time: u64
    }

    struct JobUnlockConfirmedEvent has copy, drop, store {
        job_id: u64,
        poster: address,
        worker: address,
        poster_confirmed: bool,
        worker_confirmed: bool,
        time: u64
    }

    struct Job has key, store {
        poster: address,
        cid: vector<u8>,
        start_time: u64,
        end_time: u64,
        milestones: vector<u64>,
        duration_per_milestone: vector<u64>,
        worker: Option<address>,
        approved: bool,
        active: bool,
        current_milestone: u64,
        milestone_states: table::Table<u64, MilestoneData>,
        submit_time: Option<u64>,
        escrowed_amount: u64,
        approve_time: Option<u64>,
        poster_did: vector<u8>,
        poster_profile_cid: vector<u8>,
        completed: bool,
        rejected_count: u8,
        job_expired: bool,
        milestone_deadlines: vector<u64>,
        application_deadline: u64,
        application_duration: u64,
        last_reject_time: Option<u64>,
        locked: bool,
        last_apply_time: Option<u64>,
        worker_stake: u64,
        withdraw_request: Option<address>,
        cancel_request: Option<address>,
        unlock_confirm_poster: bool,
        unlock_confirm_worker: bool,
    }

    struct Jobs has key {
        jobs: table::Table<u64, Job>,
        job_counter: u64,
    }

    struct WorkerRemovedByPosterEvent has copy, drop, store {
        job_id: u64,
        poster: address,
        worker: address,
        milestone: u64,
        time: u64,
        poster_amount: u64,
        worker_amount: u64,
        escrow_amount: u64
    }

    struct Events has key {
        post_event: event::EventHandle<JobPostedEvent>,
        approve_event: event::EventHandle<WorkerApprovedEvent>,
        submit_event: event::EventHandle<MilestoneSubmittedEvent>,
        accept_event: event::EventHandle<MilestoneAcceptedEvent>,
        reject_event: event::EventHandle<MilestoneRejectedEvent>,
        cancel_event: event::EventHandle<JobCanceledEvent>,
        complete_event: event::EventHandle<JobCompletedEvent>,
        expire_event: event::EventHandle<JobExpiredEvent>,
        fund_flow_event: event::EventHandle<FundFlowEvent>,
        apply_event: event::EventHandle<WorkerAppliedEvent>,
        worker_stake_refunded_event: event::EventHandle<WorkerStakeRefundedEvent>,
        withdraw_requested_event: event::EventHandle<WithdrawRequestedEvent>,
        withdraw_approved_event: event::EventHandle<WithdrawApprovedEvent>,
        withdraw_denied_event: event::EventHandle<WithdrawDeniedEvent>,
        cancel_requested_event: event::EventHandle<CancelRequestedEvent>,
        cancel_approved_event: event::EventHandle<CancelApprovedEvent>,
        cancel_denied_event: event::EventHandle<CancelDeniedEvent>,
        unlock_confirmed_event: event::EventHandle<JobUnlockConfirmedEvent>,
        worker_removed_by_poster_event: event::EventHandle<WorkerRemovedByPosterEvent>,
    }

    struct JobPostedEvent has copy, drop, store {
        job_id: u64,
        poster: address,
        cid: vector<u8>,
        start_time: u64,
        end_time: u64
    }

    struct WorkerApprovedEvent has copy, drop, store {
        job_id: u64,
        worker: address,
        approve_time: u64
    }

    struct MilestoneSubmittedEvent has copy, drop, store {
        job_id: u64,
        milestone: u64,
        submit_time: u64,
        work_cid: vector<u8>
    }

    struct MilestoneAcceptedEvent has copy, drop, store {
        job_id: u64,
        milestone: u64,
        accept_time: u64,
        acceptance_cid: vector<u8>
    }

    struct MilestoneRejectedEvent has copy, drop, store {
        job_id: u64,
        milestone: u64,
        reject_time: u64,
        reject_count: u8,
        rejection_cid: vector<u8>
    }

    struct JobCanceledEvent has copy, drop, store {
        job_id: u64,
        cancel_time: u64
    }

    struct JobCompletedEvent has copy, drop, store {
        job_id: u64,
        complete_time: u64
    }

    struct JobExpiredEvent has copy, drop, store {
        job_id: u64,
        expire_time: u64
    }

    struct WorkerAppliedEvent has copy, drop, store {
        job_id: u64,
        worker: address,
        apply_time: u64
    }

    struct WorkerStakeRefundedEvent has copy, drop, store {
        job_id: u64,
        worker: address,
        reason: u8, // 1: worker withdraw, 2: poster reject, 3: reopen
        time: u64
    }

    struct MarketplaceCapability has key {
        cap: SignerCapability,
        escrow_address: address, 
    }

   
    fun is_valid_cid(cid: &vector<u8>): bool {
        let len = vector::length(cid);
      
        if (len < 10 || len > 100) return false;
        
        let i = 0;
        while (i < len) {
            let byte = *vector::borrow(cid, i);
        
            if (!((byte >= 48 && byte <= 57) || // 0-9
                  (byte >= 65 && byte <= 90) || // A-Z
                  (byte >= 97 && byte <= 122) || // a-z
                  byte == 45 || // -
                  byte == 95 || // _
                  byte == 46)) { // .
                return false
            };
            i = i + 1;
        };
        true
    }

    public entry fun init_events(account: &signer) {
        move_to(account, Events {
            post_event: account::new_event_handle<JobPostedEvent>(account),
            approve_event: account::new_event_handle<WorkerApprovedEvent>(account),
            submit_event: account::new_event_handle<MilestoneSubmittedEvent>(account),
            accept_event: account::new_event_handle<MilestoneAcceptedEvent>(account),
            reject_event: account::new_event_handle<MilestoneRejectedEvent>(account),
            cancel_event: account::new_event_handle<JobCanceledEvent>(account),
            complete_event: account::new_event_handle<JobCompletedEvent>(account),
            expire_event: account::new_event_handle<JobExpiredEvent>(account),
            fund_flow_event: account::new_event_handle<FundFlowEvent>(account),
            apply_event: account::new_event_handle<WorkerAppliedEvent>(account),
            worker_stake_refunded_event: account::new_event_handle<WorkerStakeRefundedEvent>(account),
            withdraw_requested_event: account::new_event_handle<WithdrawRequestedEvent>(account),
            withdraw_approved_event: account::new_event_handle<WithdrawApprovedEvent>(account),
            withdraw_denied_event: account::new_event_handle<WithdrawDeniedEvent>(account),
            cancel_requested_event: account::new_event_handle<CancelRequestedEvent>(account),
            cancel_approved_event: account::new_event_handle<CancelApprovedEvent>(account),
            cancel_denied_event: account::new_event_handle<CancelDeniedEvent>(account),
            unlock_confirmed_event: account::new_event_handle<JobUnlockConfirmedEvent>(account),
            worker_removed_by_poster_event: account::new_event_handle<WorkerRemovedByPosterEvent>(account),
        });
    }

    public entry fun initialize_marketplace(account: &signer) {
        let owner_addr = signer::address_of(account);
        assert!(owner_addr == @job_work_board, EINVALID_SIGNER_FOR_INIT);

        if (!exists<Jobs>(owner_addr)) {
            move_to(account, Jobs {
                jobs: table::new<u64, Job>(),
                job_counter: 0,
            });
        };

        if (!exists<Events>(owner_addr)) {
            init_events(account);
        };
     
        if (!exists<MarketplaceCapability>(owner_addr)) {
            let (escrow_signer, escrow_cap) = account::create_resource_account(account, x"6d61726b6574706c6163655f657363726f77");
            let escrow_address = signer::address_of(&escrow_signer);
            move_to(account, MarketplaceCapability { cap: escrow_cap, escrow_address: escrow_address });
            coin::register<AptosCoin>(&escrow_signer);
        }
    }

    public entry fun post_job(
        account: &signer,
        _job_title: vector<u8>,
        job_details_cid: vector<u8>,
        milestones: vector<u64>,
        application_deadline: u64,
        _skills: vector<vector<u8>>,
        duration_per_milestone: vector<u64>
    ) acquires Jobs, Events, MarketplaceCapability {
        let sender = signer::address_of(account);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        assert!(web3_profiles_v29::has_profile(sender), ENO_PROFILE);

        let jobs_res = borrow_global_mut<Jobs>(@job_work_board);

        let job_id = jobs_res.job_counter;
        jobs_res.job_counter = jobs_res.job_counter + 1;

        let total_milestone_amount = 0u64;
        let i = 0;
        let total_milestones = vector::length(&milestones);
        while (i < total_milestones) {
            let amount = *vector::borrow(&milestones, i);
            assert!(amount > 0, EINVALID_AMOUNT);
            total_milestone_amount = total_milestone_amount + amount;
            i = i + 1;
        };
        assert!(total_milestone_amount > 0, EINVALID_AMOUNT);

        let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
        coin::transfer<AptosCoin>(account, marketplace_cap.escrow_address, total_milestone_amount);

        let start_time = timestamp::now_seconds();
        let end_time = 0u64;
        let milestone_states_table = table::new<u64, MilestoneData>();
        let milestone_deadlines_vec = vector::empty<u64>();
        let i = 0;
        while (i < total_milestones) {
            table::add(&mut milestone_states_table, i, MilestoneData {
                submitted: false,
                accepted: false,
                submit_time: 0,
                reject_count: 0,
                submission_cid: vector::empty<u8>(),
                acceptance_cid: vector::empty<u8>(),
                rejection_cid: vector::empty<u8>(),
            });
            i = i + 1;
        };

        let new_job = Job {
            poster: sender,
            cid: job_details_cid,
            start_time: start_time,
            end_time: end_time,
            milestones: milestones,
            duration_per_milestone: duration_per_milestone,
            worker: option::none(),
            approved: false,
            active: true,
            current_milestone: 0,
            milestone_states: milestone_states_table,
            submit_time: option::none(),
            escrowed_amount: total_milestone_amount,
            approve_time: option::none(),
            poster_did: vector::empty<u8>(),
            poster_profile_cid: vector::empty<u8>(),
            completed: false,
            rejected_count: 0,
            job_expired: false,
            milestone_deadlines: milestone_deadlines_vec,
            application_deadline: application_deadline,
            application_duration: application_deadline - start_time,
            last_reject_time: option::none(),
            locked: false,
            last_apply_time: option::none(),
            worker_stake: 0,
            withdraw_request: option::none(),
            cancel_request: option::none(),
            unlock_confirm_poster: false,
            unlock_confirm_worker: false,
        };

        table::add(&mut jobs_res.jobs, job_id, new_job);
        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.post_event, 
                JobPostedEvent {
                    job_id: job_id,
                    poster: sender,
                    cid: job_details_cid,
                    start_time: start_time,
                    end_time: end_time
                }
            );
        }
    }

    public entry fun approve_worker(
        poster: &signer,
        job_id: u64,
        worker: address
    ) acquires Jobs, Events {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        assert!(web3_profiles_v29::has_profile(worker), ENO_PROFILE);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), EWORKER_NOT_APPLIED);
        assert!(!job.approved, EALREADY_HAS_WORKER);
        let current_worker = *option::borrow(&job.worker);
        assert!(current_worker == worker, ENOT_SELECTED);
        assert!(job.poster != worker, ENOT_POSTER);

        // Calculate milestone deadlines
        let current_time = timestamp::now_seconds();
        let milestone_deadlines = vector::empty<u64>();
        let i = 0;
        let total_milestones = vector::length(&job.duration_per_milestone);
        let sum_duration = 0u64;
        while (i < total_milestones) {
            let duration = *vector::borrow(&job.duration_per_milestone, i);
            sum_duration = sum_duration + duration;
            vector::push_back(&mut milestone_deadlines, current_time + sum_duration);
            i = i + 1;
        };
        job.milestone_deadlines = milestone_deadlines;

        job.worker = option::some(worker);
        job.approved = true;
        job.approve_time = option::some(current_time);
        job.start_time = current_time;

        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.approve_event,
                WorkerApprovedEvent {
                    job_id,
                    worker: worker,
                    approve_time: current_time
                }
            );
        }
    }

    public entry fun submit_milestone(
        worker: &signer,
        job_id: u64,
        milestone_index: u64,
        work_cid: vector<u8> 
    ) acquires Jobs, Events {
        let worker_addr = signer::address_of(worker);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED); 
        assert!(is_valid_cid(&work_cid), EINVALID_CID);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        assert!(option::is_some(&job.worker), ENOT_WORKER);
        assert!(option::borrow(&job.worker) == &worker_addr, ENOT_WORKER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(job.approved, ENOT_APPROVED);
        assert!(milestone_index < vector::length(&job.milestones), EINVALID_MILESTONE);
        assert!(option::is_none(&job.withdraw_request), 2001);
        assert!(option::is_none(&job.cancel_request), 3004);

        let milestone_states = &mut job.milestone_states;
        assert!(table::contains(milestone_states, milestone_index), EINVALID_MILESTONE);
        let milestone_data = table::borrow_mut(milestone_states, milestone_index);
        assert!(!milestone_data.submitted, EALREADY_SUBMITTED);

        milestone_data.submitted = true;
        milestone_data.submit_time = timestamp::now_seconds();
        milestone_data.submission_cid = work_cid;

        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.submit_event,
                MilestoneSubmittedEvent {
                    job_id,
                    milestone: milestone_index,
                    submit_time: timestamp::now_seconds(),
                    work_cid: work_cid
                }
            );
        }
    }

    public entry fun accept_milestone(
        poster: &signer,
        job_id: u64,
        milestone_index: u64,
        acceptance_cid: vector<u8> 
    ) acquires Jobs, Events, MarketplaceCapability {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        assert!(is_valid_cid(&acceptance_cid), EINVALID_CID);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), ENOT_WORKER);

        let milestone_states = &mut job.milestone_states;
        assert!(table::contains(milestone_states, milestone_index), EINVALID_MILESTONE);
        let milestone_data = table::borrow_mut(milestone_states, milestone_index);
        assert!(milestone_data.submitted, ENOT_SUBMITTED);
        assert!(!milestone_data.accepted, EALREADY_SUBMITTED);

        let milestone_amount = *vector::borrow(&job.milestones, milestone_index);
        assert!(milestone_amount > 0, EINVALID_AMOUNT);
        let worker_addr = *option::borrow(&job.worker);

        let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
        let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
        coin::transfer<AptosCoin>(&module_signer, worker_addr, milestone_amount);
        job.escrowed_amount = job.escrowed_amount - milestone_amount;
        milestone_data.accepted = true;
        milestone_data.acceptance_cid = acceptance_cid;
        job.current_milestone = milestone_index + 1;
        if (job.current_milestone == vector::length(&job.milestones)) {
            job.completed = true;
            job.active = false;
        };

        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.accept_event,
                MilestoneAcceptedEvent {
                    job_id,
                    milestone: milestone_index,
                    accept_time: timestamp::now_seconds(),
                    acceptance_cid: acceptance_cid
                }
            );
            event::emit_event(
                &mut events.fund_flow_event,
                FundFlowEvent {
                    job_id,
                    to: worker_addr,
                    amount: milestone_amount,
                    time: timestamp::now_seconds()
                }
            );
        }
    }

    public entry fun reject_milestone(
        poster: &signer,
        job_id: u64,
        milestone_index: u64,
        rejection_cid: vector<u8>
    ) acquires Jobs, Events {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED); 
        assert!(is_valid_cid(&rejection_cid), EINVALID_CID);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), ENOT_WORKER);
        assert!(!job.locked, ENOT_ACTIVE); 
        let milestone_states = &mut job.milestone_states;
        assert!(table::contains(milestone_states, milestone_index), EINVALID_MILESTONE);
        let milestone_data = table::borrow_mut(milestone_states, milestone_index);
        assert!(milestone_data.submitted, ENOT_SUBMITTED);
        assert!(!milestone_data.accepted, EALREADY_SUBMITTED);
        assert!(milestone_data.reject_count < MAX_REJECTIONS, EREJECT_LIMIT_REACHED);
        milestone_data.submitted = false;
        milestone_data.reject_count = milestone_data.reject_count + 1;
        milestone_data.rejection_cid = rejection_cid;
        job.rejected_count = job.rejected_count + 1;
        job.last_reject_time = option::some(timestamp::now_seconds());
        if (milestone_data.reject_count == MAX_REJECTIONS) {
            job.active = false;
            job.locked = true;
        };
        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.reject_event,
                MilestoneRejectedEvent {
                    job_id,
                    milestone: milestone_index,
                    reject_time: timestamp::now_seconds(),
                    reject_count: milestone_data.reject_count,
                    rejection_cid: rejection_cid
                }
            );
        }
    }

    public entry fun cancel_job(
        account: &signer,
        job_id: u64
    ) acquires Jobs, Events, MarketplaceCapability {
        let account_addr = signer::address_of(account);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        if (job.approved && option::is_some(&job.worker)) {
            assert!(option::is_some(&job.cancel_request), 3003); 
        };
        assert!(option::is_none(&job.withdraw_request), 2002);
        assert!(job.poster == account_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_none(&job.worker), ENOT_CANCELABLE);

        let remaining_funds = job.escrowed_amount;
        if (remaining_funds > 0) {
            let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
            let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
            coin::transfer<AptosCoin>(&module_signer, account_addr, remaining_funds);
            job.escrowed_amount = 0; 
        };

        job.active = false;
        job.job_expired = true;

        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.cancel_event,
                JobCanceledEvent {
                    job_id,
                    cancel_time: timestamp::now_seconds()
                }
            );
        }
    }

    public entry fun complete_job(
    account: &signer,
    job_id: u64
) acquires Jobs, Events, MarketplaceCapability {
    let account_addr = signer::address_of(account);
    assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED); 
    let jobs = borrow_global_mut<Jobs>(@job_work_board);
    assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
    let job = table::borrow_mut(&mut jobs.jobs, job_id);

    assert!(job.poster == account_addr, ENOT_POSTER);
    assert!(job.active, ENOT_ACTIVE);
    assert!(option::is_some(&job.worker), ENOT_WORKER);

    assert!(job.current_milestone == vector::length(&job.milestones), ENOT_READY_TO_AUTO_CONFIRM);

    job.active = false;
    job.completed = true;

    let principal = job.escrowed_amount;
    let worker_addr = *option::borrow(&job.worker);
    let total = principal + job.worker_stake;
    let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
    let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
    coin::transfer<AptosCoin>(&module_signer, worker_addr, total);
    job.escrowed_amount = 0;
    job.worker_stake = 0;

    if (exists<Events>(@job_work_board)) {
        let events = borrow_global_mut<Events>(@job_work_board);
        event::emit_event(
            &mut events.complete_event,
            JobCompletedEvent {
                job_id,
                complete_time: timestamp::now_seconds()
            }
        );
    }
}

    public entry fun expire_job(
        account: &signer,
        job_id: u64
    ) acquires Jobs, Events, MarketplaceCapability {
        let _account_addr = signer::address_of(account);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_none(&job.worker) || !job.approved, EEXPIRE_WHEN_APPROVED_WORKER);
        assert!(timestamp::now_seconds() > job.application_deadline, ENOT_IN_APPLY_TIME);

        if (option::is_some(&job.worker) && !job.approved && job.worker_stake > 0) {
            let worker_addr = *option::borrow(&job.worker);
            let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
            let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
            coin::transfer<AptosCoin>(&module_signer, worker_addr, job.worker_stake);
            if (exists<Events>(@job_work_board)) {
                let events = borrow_global_mut<Events>(@job_work_board);
                event::emit_event(
                    &mut events.worker_stake_refunded_event,
                    WorkerStakeRefundedEvent {
                        job_id: job_id,
                        worker: worker_addr,
                        reason: 4,
                        time: timestamp::now_seconds()
                    }
                );
            };
            job.worker_stake = 0;
            job.worker = option::none();
        };

        if (option::is_none(&job.worker)) {
            let remaining_funds = job.escrowed_amount;
            if (remaining_funds > 0) {
                let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
                let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
                coin::transfer<AptosCoin>(&module_signer, job.poster, remaining_funds);
                job.escrowed_amount = 0; 
            };
        };

        job.active = false;
        job.job_expired = true;
        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.expire_event,
                JobExpiredEvent {
                    job_id,
                    expire_time: timestamp::now_seconds()
                }
            );
        };
    }

    public entry fun reopen_applications(
        poster: &signer,
        job_id: u64,
      
    ) acquires Jobs, MarketplaceCapability, Events {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), ENOT_READY_TO_REOPEN); 

        job.application_deadline = timestamp::now_seconds() + job.application_duration;

        if (job.worker_stake > 0 && option::is_some(&job.worker)) {
            let worker_addr = *option::borrow(&job.worker);
            let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
            let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
            coin::transfer<AptosCoin>(&module_signer, worker_addr, job.worker_stake);
            if (exists<Events>(@job_work_board)) {
                let events = borrow_global_mut<Events>(@job_work_board);
                event::emit_event(
                    &mut events.worker_stake_refunded_event,
                    WorkerStakeRefundedEvent {
                        job_id: job_id,
                        worker: worker_addr,
                        reason: 3,
                        time: timestamp::now_seconds()
                    }
                );
            };
            job.worker_stake = 0;
        };
        job.worker = option::none();
        job.approved = false;
        job.approve_time = option::none(); 
        job.rejected_count = 0; 
        job.last_reject_time = option::none(); 
    }

    public entry fun apply(
        worker: &signer,
        job_id: u64
    ) acquires Jobs, Events, MarketplaceCapability {
        let worker_addr = signer::address_of(worker);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        assert!(web3_profiles_v29::has_profile(worker_addr), ENO_PROFILE);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(job.active, ENOT_ACTIVE);
        assert!(timestamp::now_seconds() <= job.application_deadline, EAPPLICATION_DEADLINE_PASSED);
        assert!(job.poster != worker_addr, ENOT_AUTHORIZED);
        if (option::is_some(&job.worker)) {
            let current_worker = *option::borrow(&job.worker);
            if (current_worker == worker_addr) {
                if (option::is_some(&job.last_apply_time)) {
                    let last = *option::borrow(&job.last_apply_time);
                    assert!(timestamp::now_seconds() >= last + 8 * 3600, EALREADY_APPLIED);
                }
            } else {
                assert!(false, EALREADY_HAS_WORKER);
            }
        };
        let stake_amount = ONE_APT; // 1 APT
        let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
        coin::transfer<AptosCoin>(worker, marketplace_cap.escrow_address, stake_amount);
        job.worker = option::some(worker_addr);
        job.approved = false;
        job.last_apply_time = option::some(timestamp::now_seconds());
        job.worker_stake = stake_amount;
        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.apply_event,
                WorkerAppliedEvent {
                    job_id: job_id,
                    worker: worker_addr,
                    apply_time: timestamp::now_seconds()
                }
            );
        }
    }

    public entry fun worker_withdraw_apply(
        worker: &signer,
        job_id: u64
    ) acquires Jobs, MarketplaceCapability, Events {
        let worker_addr = signer::address_of(worker);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(option::is_some(&job.worker), EWORKER_NOT_APPLIED);
        let current_worker = *option::borrow(&job.worker);
        assert!(current_worker == worker_addr, ENOT_WORKER);
        assert!(!job.approved, EALREADY_HAS_WORKER);
        let now = timestamp::now_seconds();
        let expired = now > job.application_deadline;
        if (job.worker_stake > 0) {
        let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
        let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
        coin::transfer<AptosCoin>(&module_signer, worker_addr, job.worker_stake);
        
        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            let reason_val = if (expired) { 4 } else { 1 }; 
            event::emit_event(
                &mut events.worker_stake_refunded_event,
                WorkerStakeRefundedEvent {
                    job_id: job_id,
                    worker: worker_addr,
                    reason: reason_val,
                    time: now
                    }
                );
            };
            
            job.worker_stake = 0;
        };

        job.worker = option::none();
        job.approved = false;
        job.approve_time = option::none();
        if (expired) {
            job.active = false;
            job.job_expired = true;
            if (exists<Events>(@job_work_board)) {
                let events = borrow_global_mut<Events>(@job_work_board);
                event::emit_event(
                    &mut events.expire_event,
                    JobExpiredEvent {
                        job_id: job_id,
                        expire_time: now
                    }
                );
            };
        };
    }

    public entry fun poster_reject_worker(
        poster: &signer,
        job_id: u64
    ) acquires Jobs, MarketplaceCapability, Events {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(option::is_some(&job.worker), EWORKER_NOT_APPLIED);
        assert!(!job.approved, EALREADY_HAS_WORKER);
        let worker_addr = *option::borrow(&job.worker);
        if (job.worker_stake > 0) {
            let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
            let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
            coin::transfer<AptosCoin>(&module_signer, worker_addr, job.worker_stake);
            if (exists<Events>(@job_work_board)) {
                let events = borrow_global_mut<Events>(@job_work_board);
                event::emit_event(
                    &mut events.worker_stake_refunded_event,
                    WorkerStakeRefundedEvent {
                        job_id: job_id,
                        worker: worker_addr,
                        reason: 2,
                        time: timestamp::now_seconds()
                    }
                );
            };
            job.worker_stake = 0;
        };
        job.worker = option::none();
        job.approved = false;
        job.approve_time = option::none();
    }

    public entry fun request_withdraw_apply(worker: &signer, job_id: u64) acquires Jobs, Events {
        let worker_addr = signer::address_of(worker);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(option::is_some(&job.worker), EWORKER_NOT_APPLIED);
        assert!(*option::borrow(&job.worker) == worker_addr, ENOT_WORKER);
        assert!(job.approved, ENOT_APPROVED);
        assert!(option::is_none(&job.withdraw_request), 1001);
        assert!(option::is_none(&job.cancel_request), ECANCEL_REQUEST_PENDING);

        job.withdraw_request = option::some(worker_addr);

        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.withdraw_requested_event,
                WithdrawRequestedEvent {
                    job_id,
                    worker: worker_addr,
                    time: timestamp::now_seconds()
                }
            );
        }
    }

    public entry fun approve_withdraw_apply(poster: &signer, job_id: u64, approve: bool) acquires Jobs, MarketplaceCapability, Events {
        let poster_addr = signer::address_of(poster);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(option::is_some(&job.withdraw_request), 1002); 
        let worker_addr = *option::borrow(&job.withdraw_request);

        if (!approve) {
          
            job.withdraw_request = option::none();
            if (exists<Events>(@job_work_board)) {
                let events = borrow_global_mut<Events>(@job_work_board);
                event::emit_event(
                    &mut events.withdraw_denied_event,
                    WithdrawDeniedEvent {
                        job_id,
                        worker: worker_addr,
                        poster: poster_addr,
                        time: timestamp::now_seconds()
                    }
                );
            };
            return;
        };

   
        let total_stake = job.worker_stake;
        let worker_amount = total_stake * 50 / 100;
        let poster_amount = total_stake * 30 / 100;
        let escrow_amount = total_stake - worker_amount - poster_amount;

        let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
        let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);

        if (worker_amount > 0) {
            coin::transfer<AptosCoin>(&module_signer, worker_addr, worker_amount);
        };
        if (poster_amount > 0) {
            coin::transfer<AptosCoin>(&module_signer, poster_addr, poster_amount);
        };
        if (escrow_amount > 0) {
            coin::transfer<AptosCoin>(&module_signer, marketplace_cap.escrow_address, escrow_amount);
        };

        // Reset job
        job.worker = option::none();
        job.approved = false;
        job.approve_time = option::none();
        job.rejected_count = 0;
        job.last_reject_time = option::none();
        job.current_milestone = 0;
        job.worker_stake = 0;
        job.withdraw_request = option::none();

        // Reset milestone_states
        let milestone_states = &mut job.milestone_states;
        let n = vector::length(&job.milestones);
        let i = 0;
        while (i < n) {
            if (table::contains(milestone_states, i)) {
                let m = table::borrow_mut(milestone_states, i);
                m.submitted = false;
                m.accepted = false;
                m.submit_time = 0;
                m.reject_count = 0;
                m.submission_cid = vector::empty<u8>();
                m.acceptance_cid = vector::empty<u8>();
                m.rejection_cid = vector::empty<u8>();
            };
            i = i + 1;
        };

        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.withdraw_approved_event,
                WithdrawApprovedEvent {
                    job_id,
                    worker: worker_addr,
                    poster: poster_addr,
                    time: timestamp::now_seconds(),
                    worker_amount,
                    poster_amount,
                    escrow_amount
                }
            );
        };
    }

    public entry fun request_cancel_job(poster: &signer, job_id: u64) acquires Jobs, Events {
        let poster_addr = signer::address_of(poster);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), EWORKER_NOT_APPLIED);
        assert!(job.approved, ENOT_APPROVED);
        assert!(option::is_none(&job.cancel_request), 3001); 
        assert!(option::is_none(&job.withdraw_request), EWITHDRAW_REQUEST_PENDING);
        job.cancel_request = option::some(poster_addr);
        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.cancel_requested_event,
                CancelRequestedEvent {
                    job_id,
                    poster: poster_addr,
                    worker: *option::borrow(&job.worker),
                    time: timestamp::now_seconds()
                }
            );
        };
    }

    public entry fun approve_cancel_job(worker: &signer, job_id: u64, approve: bool) acquires Jobs, MarketplaceCapability, Events {
        let worker_addr = signer::address_of(worker);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(option::is_some(&job.worker), EWORKER_NOT_APPLIED);
        assert!(*option::borrow(&job.worker) == worker_addr, ENOT_WORKER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(job.approved, ENOT_APPROVED);
        assert!(option::is_some(&job.cancel_request), 3002);
        if (!approve) {
            job.cancel_request = option::none();
            if (exists<Events>(@job_work_board)) {
                let events = borrow_global_mut<Events>(@job_work_board);
                event::emit_event(
                    &mut events.cancel_denied_event,
                    CancelDeniedEvent {
                        job_id,
                        poster: job.poster,
                        worker: worker_addr,
                        time: timestamp::now_seconds()
                    }
                );
            };
            return;
        };
     
        let half_apt = 50000000u64; 
        let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
        let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
        if (half_apt > 0) {
            coin::transfer<AptosCoin>(&module_signer, worker_addr, half_apt);
        };
  
        job.escrowed_amount = job.escrowed_amount - half_apt;
        job.active = false;
        job.job_expired = true;
        job.cancel_request = option::none();
        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.cancel_approved_event,
                CancelApprovedEvent {
                    job_id,
                    poster: job.poster,
                    worker: worker_addr,
                    time: timestamp::now_seconds()
                }
            );
        };
    }

    public entry fun confirm_unlock_job(signer: &signer, job_id: u64) acquires Jobs, Events {
        let sender = signer::address_of(signer);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);
        assert!(job.locked, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), EWORKER_NOT_APPLIED);
        let worker_addr = *option::borrow(&job.worker);
        let is_poster = job.poster == sender;
        let is_worker = worker_addr == sender;
        assert!(is_poster || is_worker, ENOT_AUTHORIZED);

        if (is_poster) {
            job.unlock_confirm_poster = true;
        };
        if (is_worker) {
            job.unlock_confirm_worker = true;
        };

        if (job.unlock_confirm_poster && job.unlock_confirm_worker) {
            job.locked = false;
            job.active = true;
            job.unlock_confirm_poster = false;
            job.unlock_confirm_worker = false;
            job.rejected_count = 0;
            let milestone_states = &mut job.milestone_states;
            let n = vector::length(&job.milestones);
            let i = 0;
            while (i < n) {
                if (table::contains(milestone_states, i)) {
                    let m = table::borrow_mut(milestone_states, i);
                    m.submitted = false;
                    m.accepted = false;
                    m.submit_time = 0;
                    m.reject_count = 0;
                    m.submission_cid = vector::empty<u8>();
                    m.acceptance_cid = vector::empty<u8>();
                    m.rejection_cid = vector::empty<u8>();
                };
                i = i + 1;
            };
     
            let current_time = timestamp::now_seconds();
            let milestone_deadlines = vector::empty<u64>();
            let i = 0;
            let total_milestones = vector::length(&job.duration_per_milestone);
            let sum_duration = 0u64;
            while (i < total_milestones) {
                let duration = *vector::borrow(&job.duration_per_milestone, i);
                sum_duration = sum_duration + duration;
                vector::push_back(&mut milestone_deadlines, current_time + sum_duration);
                i = i + 1;
            };
            job.milestone_deadlines = milestone_deadlines;
        };

        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.unlock_confirmed_event,
                JobUnlockConfirmedEvent {
                    job_id,
                    poster: job.poster,
                    worker: worker_addr,
                    poster_confirmed: job.unlock_confirm_poster,
                    worker_confirmed: job.unlock_confirm_worker,
                    time: timestamp::now_seconds()
                }
            );
        };
    }

    public entry fun poster_remove_inactive_worker(
        poster: &signer,
        job_id: u64
    ) acquires Jobs, MarketplaceCapability, Events {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), EWORKER_NOT_APPLIED);
        assert!(job.approved, ENOT_APPROVED);

        let worker_addr = *option::borrow(&job.worker);
        let current_milestone = job.current_milestone;
        let milestone_deadline = *vector::borrow(&job.milestone_deadlines, current_milestone);
        let now = timestamp::now_seconds();

   
        let milestone_states = &mut job.milestone_states;
        let milestone_data = table::borrow_mut(milestone_states, current_milestone);
        assert!(now > milestone_deadline, EREMOVE_WORKER_NOT_EXPIRED);
        assert!(!milestone_data.submitted, EREMOVE_WORKER_ALREADY_SUBMITTED);

      
        let total_stake = job.worker_stake;
        let poster_amount = 50000000u64; 
        let worker_amount = 20000000u64; 
        let escrow_amount = total_stake - poster_amount - worker_amount;

        let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
        let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);

        if (poster_amount > 0) {
            coin::transfer<AptosCoin>(&module_signer, poster_addr, poster_amount);
        };
        if (worker_amount > 0) {
            coin::transfer<AptosCoin>(&module_signer, worker_addr, worker_amount);
        };
        if (escrow_amount > 0) {
            coin::transfer<AptosCoin>(&module_signer, marketplace_cap.escrow_address, escrow_amount);
        };

        job.worker = option::none();
        job.approved = false;
        job.approve_time = option::none();
        job.rejected_count = 0;
        job.last_reject_time = option::none();
        job.current_milestone = 0;
        job.worker_stake = 0;

        let n = vector::length(&job.milestones);
        let i = 0;
        while (i < n) {
            if (table::contains(milestone_states, i)) {
                let m = table::borrow_mut(milestone_states, i);
                m.submitted = false;
                m.accepted = false;
                m.submit_time = 0;
                m.reject_count = 0;
                m.submission_cid = vector::empty<u8>();
                m.acceptance_cid = vector::empty<u8>();
                m.rejection_cid = vector::empty<u8>();
            };
            i = i + 1;
        };
        // Emit event
        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.worker_removed_by_poster_event,
                WorkerRemovedByPosterEvent {
                    job_id: job_id,
                    poster: poster_addr,
                    worker: worker_addr,
                    milestone: current_milestone,
                    time: now,
                    poster_amount: poster_amount,
                    worker_amount: worker_amount,
                    escrow_amount: escrow_amount
                }
            );
        };
    }
}
