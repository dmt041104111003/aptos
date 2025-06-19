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
    }

    struct FundFlowEvent has copy, drop, store {
        job_id: u64,
        to: address,
        amount: u64,
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
        last_reject_time: Option<u64>,
        locked: bool,
        last_apply_time: Option<u64>,
    }

    struct Jobs has key {
        jobs: table::Table<u64, Job>,
        job_counter: u64,
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
        submit_time: u64
    }

    struct MilestoneAcceptedEvent has copy, drop, store {
        job_id: u64,
        milestone: u64,
        accept_time: u64
    }

    struct MilestoneRejectedEvent has copy, drop, store {
        job_id: u64,
        milestone: u64,
        reject_time: u64,
        reject_count: u8
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

    struct MarketplaceCapability has key {
        cap: SignerCapability,
        escrow_address: address, 
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
                reject_count: 0
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
            last_reject_time: option::none(),
            locked: false,
            last_apply_time: option::none(),
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
        milestone_index: u64
    ) acquires Jobs, Events {
        let worker_addr = signer::address_of(worker);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED); 
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        assert!(option::is_some(&job.worker), ENOT_WORKER);
        assert!(option::borrow(&job.worker) == &worker_addr, ENOT_WORKER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(job.approved, ENOT_APPROVED);
        assert!(milestone_index < vector::length(&job.milestones), EINVALID_MILESTONE);

        let milestone_states = &mut job.milestone_states;
        assert!(table::contains(milestone_states, milestone_index), EINVALID_MILESTONE);
        let milestone_data = table::borrow_mut(milestone_states, milestone_index);
        assert!(!milestone_data.submitted, EALREADY_SUBMITTED);

        milestone_data.submitted = true;
        milestone_data.submit_time = timestamp::now_seconds();

        if (exists<Events>(@job_work_board)) {
            let events = borrow_global_mut<Events>(@job_work_board);
            event::emit_event(
                &mut events.submit_event,
                MilestoneSubmittedEvent {
                    job_id,
                    milestone: milestone_index,
                    submit_time: timestamp::now_seconds()
                }
            );
        }
    }

    public entry fun accept_milestone(
        poster: &signer,
        job_id: u64,
        milestone_index: u64
    ) acquires Jobs, Events, MarketplaceCapability {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
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
                    accept_time: timestamp::now_seconds()
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
        milestone_index: u64
    ) acquires Jobs, Events {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED); 
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
                    reject_count: milestone_data.reject_count
                }
            );
        }
    }

    public entry fun cancel_job(
        account: &signer,
        job_id: u64
    ) acquires Jobs, Events {
        let account_addr = signer::address_of(account);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

   
        assert!(job.poster == account_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_none(&job.worker), ENOT_CANCELABLE);

        let remaining_funds = job.escrowed_amount;
        if (remaining_funds > 0) {
            coin::transfer<AptosCoin>(account, account_addr, remaining_funds);
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
        let marketplace_cap = borrow_global<MarketplaceCapability>(@job_work_board);
        let module_signer = account::create_signer_with_capability(&marketplace_cap.cap);
        coin::transfer<AptosCoin>(&module_signer, worker_addr, principal);
        job.escrowed_amount = 0;

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
    ) acquires Jobs, Events {
        let _account_addr = signer::address_of(account);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        assert!(job.active, ENOT_ACTIVE);
        assert!(timestamp::now_seconds() > job.application_deadline, ENOT_IN_APPLY_TIME);

  
        if (option::is_none(&job.worker)) {
            let remaining_funds = job.escrowed_amount;
            if (remaining_funds > 0) {
                coin::transfer<AptosCoin>(account, job.poster, remaining_funds);
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
        }
    }

    public entry fun reopen_applications(
        poster: &signer,
        job_id: u64
    ) acquires Jobs {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@job_work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@job_work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), ENOT_READY_TO_REOPEN); 

        assert!(timestamp::now_seconds() <= job.application_deadline, EAPPLICATION_DEADLINE_PASSED);
        
        job.worker = option::none();
        job.approved = false;
        job.approve_time = option::none(); 
        job.rejected_count = 0; 
        job.last_reject_time = option::none(); 
    }

    public entry fun apply(
        worker: &signer,
        job_id: u64
    ) acquires Jobs, Events {
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
        job.worker = option::some(worker_addr);
        job.approved = false;
        job.last_apply_time = option::some(timestamp::now_seconds());
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
}
