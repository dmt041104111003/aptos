module work_board::job_marketplace_v6 {
    use std::option::{Self, Option};
    use std::string::String;
    use std::signer;
    use aptos_framework::coin::{Self};
    use aptos_framework::aptos_coin::AptosCoin;
    use std::table;
    use std::event;
    use aptos_framework::account;
    use std::vector;
    use aptos_framework::timestamp;
    use work_profiles_addr::web3_profiles_v8;

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

    const APPLY_FEE: u64 = 1000000; // 0.01 APT
    const MAX_REJECTIONS: u8 = 3;
    const AUTO_CONFIRM_DELAY: u64 = 7 * 24 * 60 * 60; // 7 days in seconds

    struct MilestoneData has copy, drop, store {
        submitted: bool,
        accepted: bool,
        submit_time: u64,
        reject_count: u8
    }

    struct Application has copy, drop, store {
        worker: address,
        apply_time: u64,
        did: String,
        profile_cid: String
    }

    struct FundFlowEvent has copy, drop, store {
        job_id: u64,
        to: address,
        amount: u64,
        time: u64
    }

    struct Job has key, store {
        poster: address,
        cid: String,
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
        escrowed_amount: u64, // Track funds held by the module for this job
        applications: vector<Application>,
        approve_time: Option<u64>,
        poster_did: String,
        poster_profile_cid: String,
        completed: bool,
        rejected_count: u8,
        job_expired: bool,
        auto_confirmed: vector<bool>,
        milestone_deadlines: vector<u64>,
        application_deadline: u64,
        selected_application_index: Option<u64>,
        last_reject_time: Option<u64>
    }

    struct Jobs has key {
        jobs: table::Table<u64, Job>,
        job_counter: u64,
    }

    struct Events has key {
        post_event: event::EventHandle<JobPostedEvent>,
        apply_event: event::EventHandle<WorkerAppliedEvent>,
        approve_event: event::EventHandle<WorkerApprovedEvent>,
        submit_event: event::EventHandle<MilestoneSubmittedEvent>,
        accept_event: event::EventHandle<MilestoneAcceptedEvent>,
        reject_event: event::EventHandle<MilestoneRejectedEvent>,
        auto_confirm_event: event::EventHandle<MilestoneAutoConfirmedEvent>,
        cancel_event: event::EventHandle<JobCanceledEvent>,
        complete_event: event::EventHandle<JobCompletedEvent>,
        expire_event: event::EventHandle<JobExpiredEvent>,
        fund_flow_event: event::EventHandle<FundFlowEvent>
    }

    struct JobPostedEvent has copy, drop, store {
        job_id: u64,
        poster: address,
        cid: String,
        start_time: u64,
        end_time: u64
    }

    struct WorkerAppliedEvent has copy, drop, store {
        job_id: u64,
        worker: address,
        apply_time: u64,
        did: String,
        profile_cid: String
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

    struct MilestoneAutoConfirmedEvent has copy, drop, store {
        job_id: u64,
        milestone: u64,
        auto_confirm_time: u64
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

    public entry fun init_events(account: &signer) {
        move_to(account, Events {
            post_event: account::new_event_handle<JobPostedEvent>(account),
            apply_event: account::new_event_handle<WorkerAppliedEvent>(account),
            approve_event: account::new_event_handle<WorkerApprovedEvent>(account),
            submit_event: account::new_event_handle<MilestoneSubmittedEvent>(account),
            accept_event: account::new_event_handle<MilestoneAcceptedEvent>(account),
            reject_event: account::new_event_handle<MilestoneRejectedEvent>(account),
            auto_confirm_event: account::new_event_handle<MilestoneAutoConfirmedEvent>(account),
            cancel_event: account::new_event_handle<JobCanceledEvent>(account),
            complete_event: account::new_event_handle<JobCompletedEvent>(account),
            expire_event: account::new_event_handle<JobExpiredEvent>(account),
            fund_flow_event: account::new_event_handle<FundFlowEvent>(account)
        });
    }

    public entry fun initialize_marketplace(account: &signer) {
        let owner_addr = signer::address_of(account);
        assert!(owner_addr == @work_board, EINVALID_SIGNER_FOR_INIT);

        if (!exists<Jobs>(owner_addr)) {
            // Initialize CoinStore for the module's address if it doesn't exist
            coin::register<AptosCoin>(account); // Ensure module's CoinStore is registered

            move_to(account, Jobs {
                jobs: table::new<u64, Job>(),
                job_counter: 0,
            });
        };

        if (!exists<Events>(owner_addr)) {
            init_events(account);
        };
    }

    // Helper function to transfer funds from the module's CoinStore
    fun transfer_from_module(module_signer: &signer, recipient: address, amount: u64) {
        assert!(coin::balance<AptosCoin>(signer::address_of(module_signer)) >= amount, EINSUFFICIENT_FUNDS);
        coin::transfer<AptosCoin>(module_signer, recipient, amount);
    }

    public entry fun post_job(
        account: &signer,
        job_details_cid: String,
        application_deadline: u64,
        initial_fund_amount: u64,
        poster_did: String,
        poster_profile_cid: String,
        milestone_amounts: vector<u64>,
        milestone_durations: vector<u64>
    ) acquires Jobs, Events {
        let sender = signer::address_of(account);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED); // Access Jobs resource from module address
        let jobs_res = borrow_global_mut<Jobs>(@work_board);

        let job_id = jobs_res.job_counter;
        jobs_res.job_counter = jobs_res.job_counter + 1;

        // Frontend should transfer initial_fund_amount to @work_board before calling this
        // This function only records the escrowed amount
        assert!(initial_fund_amount > 0, EINVALID_AMOUNT);
        assert!(coin::balance<AptosCoin>(@work_board) >= initial_fund_amount, EINSUFFICIENT_FUNDS); // Check module's balance


        let start_time = timestamp::now_seconds();
        let end_time = 0u64;

        let milestone_states_table = table::new<u64, MilestoneData>();
        let auto_confirmed_vec = vector::empty<bool>();
        let milestone_deadlines_vec = vector::empty<u64>();

        let i = 0;
        let total_milestones = vector::length(&milestone_amounts);
        let cumulative_duration = 0u64;

        while (i < total_milestones) {
            table::add(&mut milestone_states_table, i, MilestoneData {
                submitted: false,
                accepted: false,
                submit_time: 0,
                reject_count: 0
            });

            // Calculate milestone deadline
            let milestone_duration = *vector::borrow(&milestone_durations, i);
            cumulative_duration = cumulative_duration + milestone_duration;
            vector::push_back(&mut milestone_deadlines_vec, start_time + cumulative_duration);
            vector::push_back(&mut auto_confirmed_vec, false);

            i = i + 1;
        };

        let new_job = Job {
            poster: sender,
            cid: job_details_cid,
            start_time: start_time,
            end_time: end_time,
            milestones: milestone_amounts,
            duration_per_milestone: milestone_durations,
            worker: option::none(),
            approved: false,
            active: true,
            current_milestone: 0,
            milestone_states: milestone_states_table,
            submit_time: option::none(),
            escrowed_amount: initial_fund_amount, // Store the escrowed amount
            applications: vector::empty<Application>(),
            approve_time: option::none(),
            poster_did: poster_did,
            poster_profile_cid: poster_profile_cid,
            completed: false,
            rejected_count: 0,
            job_expired: false,
            auto_confirmed: auto_confirmed_vec,
            milestone_deadlines: milestone_deadlines_vec,
            application_deadline: application_deadline,
            selected_application_index: option::none(),
            last_reject_time: option::none()
        };

        table::add(&mut jobs_res.jobs, job_id, new_job);

        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED); // Access Events resource from module address
        let events = borrow_global_mut<Events>(@work_board);
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

    public entry fun apply_for_job(
        worker: &signer,
        job_id: u64,
        worker_did: String,
        worker_profile_cid: String
    ) acquires Jobs, Events {
        let worker_addr = signer::address_of(worker);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED); // Access Jobs resource from module address
        let jobs = borrow_global_mut<Jobs>(@work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        // Verify worker's profile and DID
        assert!(web3_profiles_v8::has_profile(worker_addr), EINVALID_PROFILE);
        let profile_did = web3_profiles_v8::get_profile_did(worker_addr);
        assert!(profile_did == worker_did, EINVALID_DID);

        // Check if job is active and within application deadline
        assert!(job.active, ENOT_ACTIVE);
        assert!(timestamp::now_seconds() <= job.application_deadline, ENOT_IN_APPLY_TIME);

        // Check if worker hasn't already applied
        let i = 0;
        let len = vector::length(&job.applications);
        while (i < len) {
            let application = vector::borrow(&job.applications, i);
            assert!(application.worker != worker_addr, EALREADY_APPLIED);
            i = i + 1;
        };

        // Pay application fee to the module
        coin::transfer<AptosCoin>(worker, @work_board, APPLY_FEE);

        // Add application
        let new_application = Application {
            worker: worker_addr,
            apply_time: timestamp::now_seconds(),
            did: worker_did,
            profile_cid: worker_profile_cid
        };
        vector::push_back(&mut job.applications, new_application);

        // Emit event from poster's address
        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED); // Access Events resource from module address
        let events = borrow_global_mut<Events>(@work_board);
        event::emit_event(
            &mut events.apply_event,
            WorkerAppliedEvent {
                job_id,
                worker: worker_addr,
                apply_time: timestamp::now_seconds(),
                did: worker_did,
                profile_cid: worker_profile_cid
            }
        );
    }

    public entry fun approve_worker(
        poster: &signer,
        job_id: u64,
        application_index: u64
    ) acquires Jobs, Events {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED); // Access Jobs resource from module address
        let jobs = borrow_global_mut<Jobs>(@work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        // Verify poster
        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_none(&job.worker), EALREADY_HAS_WORKER);

        // Verify application exists
        let applications = &job.applications;
        assert!(application_index < vector::length(applications), EWORKER_NOT_APPLIED);
        let application = vector::borrow(applications, application_index);

        // Set worker and update job state
        job.worker = option::some(application.worker);
        job.approved = true;
        job.approve_time = option::some(timestamp::now_seconds());
        job.selected_application_index = option::some(application_index);

        // Emit event
        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED); // Access Events resource from module address
        let events = borrow_global_mut<Events>(@work_board);
        event::emit_event(
            &mut events.approve_event,
            WorkerApprovedEvent {
                job_id,
                worker: application.worker,
                approve_time: timestamp::now_seconds()
            }
        );
    }

    public entry fun submit_milestone(
        worker: &signer,
        job_id: u64,
        milestone_index: u64
    ) acquires Jobs, Events {
        let worker_addr = signer::address_of(worker);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED); // Access Jobs resource from module address
        let jobs = borrow_global_mut<Jobs>(@work_board);
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

        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED); // Access Events resource from module address
        let events = borrow_global_mut<Events>(@work_board);
        event::emit_event(
            &mut events.submit_event,
            MilestoneSubmittedEvent {
                job_id,
                milestone: milestone_index,
                submit_time: timestamp::now_seconds()
            }
        );
    }

    public entry fun accept_milestone(
        poster: &signer,
        job_id: u64,
        milestone_index: u64
    ) acquires Jobs, Events {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        // Verify poster and job state
        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), ENOT_WORKER);

        // Verify milestone state
        let milestone_states = &mut job.milestone_states;
        assert!(table::contains(milestone_states, milestone_index), EINVALID_MILESTONE);
        let milestone_data = table::borrow_mut(milestone_states, milestone_index);
        assert!(milestone_data.submitted, ENOT_SUBMITTED);
        assert!(!milestone_data.accepted, EALREADY_SUBMITTED);

        // Calculate milestone payment
        let milestone_amount = vector::borrow(&job.milestones, milestone_index);
        let worker_addr = option::borrow(&job.worker);

        // Transfer milestone payment to worker
        transfer_from_module(poster, *worker_addr, *milestone_amount);
        job.escrowed_amount = job.escrowed_amount - *milestone_amount;

        // Update milestone state
        milestone_data.accepted = true;

        // Update job state
        job.current_milestone = milestone_index + 1;

        // Check if all milestones are completed
        if (job.current_milestone == vector::length(&job.milestones)) {
            job.completed = true;
            job.active = false;
        };

        // Emit events
        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED);
        let events = borrow_global_mut<Events>(@work_board);
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
                to: *worker_addr,
                amount: *milestone_amount,
                time: timestamp::now_seconds()
            }
        );
    }

    public entry fun reject_milestone(
        poster: &signer,
        job_id: u64,
        milestone_index: u64
    ) acquires Jobs, Events {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED); // Access Jobs resource from module address
        let jobs = borrow_global_mut<Jobs>(@work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        // Verify poster and job state
        assert!(job.poster == poster_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), ENOT_WORKER);

        // Verify milestone state
        let milestone_states = &mut job.milestone_states;
        assert!(table::contains(milestone_states, milestone_index), EINVALID_MILESTONE);
        let milestone_data = table::borrow_mut(milestone_states, milestone_index);
        assert!(milestone_data.submitted, ENOT_SUBMITTED);
        assert!(!milestone_data.accepted, EALREADY_SUBMITTED);

        // Check rejection limits
        assert!(milestone_data.reject_count < MAX_REJECTIONS, EREJECT_LIMIT_REACHED);

        // Update milestone state
        milestone_data.submitted = false;
        milestone_data.reject_count = milestone_data.reject_count + 1;
        job.rejected_count = job.rejected_count + 1;
        job.last_reject_time = option::some(timestamp::now_seconds());

        // Emit event
        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED); // Access Events resource from module address
        let events = borrow_global_mut<Events>(@work_board);
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

    public entry fun auto_confirm_milestone(
        account: &signer,
        job_id: u64,
        milestone_index: u64
    ) acquires Jobs, Events {
        let _account_addr = signer::address_of(account);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        // Verify job state
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), ENOT_WORKER);

        // Verify milestone state
        let milestone_states = &mut job.milestone_states;
        assert!(table::contains(milestone_states, milestone_index), EINVALID_MILESTONE);
        let milestone_data = table::borrow_mut(milestone_states, milestone_index);
        assert!(milestone_data.submitted, ENOT_SUBMITTED);
        assert!(!milestone_data.accepted, EALREADY_SUBMITTED);

        // Check if enough time has passed for auto-confirmation
        let submit_time = milestone_data.submit_time;
        assert!(timestamp::now_seconds() >= submit_time + AUTO_CONFIRM_DELAY, ENOT_READY_TO_AUTO_CONFIRM);

        // Calculate milestone payment
        let milestone_amount = vector::borrow(&job.milestones, milestone_index);
        let worker_addr = option::borrow(&job.worker);

        // Transfer milestone payment to worker
        transfer_from_module(account, *worker_addr, *milestone_amount);
        job.escrowed_amount = job.escrowed_amount - *milestone_amount;

        // Update milestone state
        milestone_data.accepted = true;

        // Update job state
        job.current_milestone = milestone_index + 1;
        vector::push_back(&mut job.auto_confirmed, true);

        // Check if all milestones are completed
        if (job.current_milestone == vector::length(&job.milestones)) {
            job.completed = true;
            job.active = false;
        };

        // Emit events
        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED);
        let events = borrow_global_mut<Events>(@work_board);
        event::emit_event(
            &mut events.auto_confirm_event,
            MilestoneAutoConfirmedEvent {
                job_id,
                milestone: milestone_index,
                auto_confirm_time: timestamp::now_seconds()
            }
        );

        event::emit_event(
            &mut events.fund_flow_event,
            FundFlowEvent {
                job_id,
                to: *worker_addr,
                amount: *milestone_amount,
                time: timestamp::now_seconds()
            }
        );
    }

    public entry fun cancel_job(
        account: &signer,
        job_id: u64
    ) acquires Jobs, Events {
        let account_addr = signer::address_of(account);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        // Verify account is poster
        assert!(job.poster == account_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);

        // Check if job is cancelable
        assert!(option::is_none(&job.worker) || job.current_milestone == 0, ENOT_CANCELABLE);

        // Return remaining funds to poster
        let remaining_funds = job.escrowed_amount;
        if (remaining_funds > 0) {
            transfer_from_module(account, account_addr, remaining_funds);
            job.escrowed_amount = 0; // All escrowed funds returned
        };

        // Update job state
        job.active = false;
        job.job_expired = true;

        // Emit events
        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED);
        let events = borrow_global_mut<Events>(@work_board);
        event::emit_event(
            &mut events.cancel_event,
            JobCanceledEvent {
                job_id,
                cancel_time: timestamp::now_seconds()
            }
        );

        if (remaining_funds > 0) {
            event::emit_event(
                &mut events.fund_flow_event,
                FundFlowEvent {
                    job_id,
                    to: account_addr,
                    amount: remaining_funds,
                    time: timestamp::now_seconds()
                }
            );
        };
    }

    public entry fun complete_job(
        account: &signer,
        job_id: u64
    ) acquires Jobs, Events {
        let account_addr = signer::address_of(account);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED); // Access Jobs resource from module address
        let jobs = borrow_global_mut<Jobs>(@work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        // Verify account is poster
        assert!(job.poster == account_addr, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), ENOT_WORKER);

        // Verify all milestones are completed
        assert!(job.current_milestone == vector::length(&job.milestones), ENOT_READY_TO_AUTO_CONFIRM);

        // Update job state
        job.active = false;
        job.completed = true;

        // Emit event
        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED); // Access Events resource from module address
        let events = borrow_global_mut<Events>(@work_board);
        event::emit_event(
            &mut events.complete_event,
            JobCompletedEvent {
                job_id,
                complete_time: timestamp::now_seconds()
            }
        );
    }

    public entry fun expire_job(
        account: &signer,
        job_id: u64
    ) acquires Jobs, Events {
        let _account_addr = signer::address_of(account);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        // Verify job is active and past deadline
        assert!(job.active, ENOT_ACTIVE);
        assert!(timestamp::now_seconds() > job.application_deadline, ENOT_IN_APPLY_TIME);

        // Return funds to poster if no worker was selected
        if (option::is_none(&job.worker)) {
            let remaining_funds = job.escrowed_amount;
            if (remaining_funds > 0) {
                transfer_from_module(account, job.poster, remaining_funds);
                job.escrowed_amount = 0; // All escrowed funds returned
            };
        };

        // Update job state
        job.active = false;
        job.job_expired = true;

        // Emit events
        assert!(exists<Events>(@work_board), EMODULE_NOT_INITIALIZED);
        let events = borrow_global_mut<Events>(@work_board);
        event::emit_event(
            &mut events.expire_event,
            JobExpiredEvent {
                job_id,
                expire_time: timestamp::now_seconds()
            }
        );

        if (option::is_none(&job.worker)) {
            let remaining_funds = job.escrowed_amount;
            if (remaining_funds > 0) {
                event::emit_event(
                    &mut events.fund_flow_event,
                    FundFlowEvent {
                        job_id,
                        to: job.poster,
                        amount: remaining_funds,
                        time: timestamp::now_seconds()
                    }
                );
            };
        };
    }

    public entry fun reopen_applications(
        poster: &signer,
        job_id: u64
    ) acquires Jobs {
        let poster_addr = signer::address_of(poster);
        assert!(exists<Jobs>(@work_board), EMODULE_NOT_INITIALIZED);
        let jobs = borrow_global_mut<Jobs>(@work_board);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

        // Verify poster
        assert!(job.poster == poster_addr, ENOT_POSTER);
        // Job must be active and have a worker assigned
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker), ENOT_READY_TO_REOPEN); // Only reopen if there's a worker

        // Cannot reopen if application deadline has passed
        assert!(timestamp::now_seconds() <= job.application_deadline, EAPPLICATION_DEADLINE_PASSED);
        
        // Reset worker and approved status
        job.worker = option::none();
        job.approved = false;
        job.approve_time = option::none(); // Clear approval time
        job.selected_application_index = option::none(); // Clear selected application
        job.rejected_count = 0; // Reset rejection count for new applications
        job.last_reject_time = option::none(); // Clear last reject time

        // No event needed specifically for reopening applications, as applications can just flow in again.
        // Or we could emit a JobReopenedEvent if needed for off-chain indexing. For now, skipping.
    }
}
