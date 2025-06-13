module work_profiles_addr::web3_profiles_v4 {

    use std::signer;
    use std::string::{String};
    use aptos_framework::event::{EventHandle, emit_event};
    use aptos_std::table;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;

    const EPROFILE_NOT_REGISTERED: u64 = 1;
    const ENOT_PROFILE_OWNER: u64 = 2;
    const EMODULE_NOT_INITIALIZED: u64 = 3;
    const EPROFILE_ALREADY_REGISTERED: u64 = 4;
    const EINVALID_REGISTRATION_CALL: u64 = 5;
    const EINVALID_UPDATE_CALL: u64 = 6;
    const ETINY_FEE_NOT_ENOUGH: u64 = 7;

    const REGISTRATION_FEE: u64 = 1000;
    const UPDATE_FEE: u64 = 100;

    struct ProfileRegistryV4 has key {
        profiles: table::Table<address, ProfileData>,
        update_events: EventHandle<ProfileUpdatedV4>,
        transfer_events: EventHandle<ProfileOwnershipTransferred>,
    }

    struct ProfileData has copy, drop, store {
        cid: String,
        cccd: u64,
        did: String,
        created_at: u64,
    }

    struct ProfileUpdatedV4 has drop, store {
        user: address,
        cid: String,
        cccd: u64,
        did: String,
        timestamp_seconds: u64,
    }

    struct ProfileOwnershipTransferred has drop, store {
        from: address,
        to: address,
        timestamp_seconds: u64,
    }

    public entry fun initialize(sender: &signer) {
        let registry = ProfileRegistryV4 {
            profiles: table::new<address, ProfileData>(),
            update_events: account::new_event_handle<ProfileUpdatedV4>(sender),
            transfer_events: account::new_event_handle<ProfileOwnershipTransferred>(sender),
        };
        move_to(sender, registry);
    }

    public entry fun register_profile(account: &signer, cid: String, cccd: u64, did: String) acquires ProfileRegistryV4 {
        let sender = signer::address_of(account);
        assert!(exists<ProfileRegistryV4>(@work_profiles_addr), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global_mut<ProfileRegistryV4>(@work_profiles_addr);

        assert!(!table::contains(&registry.profiles, sender), EPROFILE_ALREADY_REGISTERED);

        coin::transfer<AptosCoin>(account, @work_profiles_addr, REGISTRATION_FEE);

        let pdata = ProfileData {
            cid: cid,
            cccd: cccd,
            did: did,
            created_at: timestamp::now_seconds(),
        };

        table::add(&mut registry.profiles, sender, pdata);

        emit_event<ProfileUpdatedV4>(
            &mut registry.update_events,
            ProfileUpdatedV4 {
                user: sender,
                cid: pdata.cid,
                cccd: pdata.cccd,
                did: pdata.did,
                timestamp_seconds: timestamp::now_seconds(),
            },
        );
    }

    public entry fun update_profile(account: &signer, new_cid: String) acquires ProfileRegistryV4 {
        let sender = signer::address_of(account);
        assert!(exists<ProfileRegistryV4>(@work_profiles_addr), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global_mut<ProfileRegistryV4>(@work_profiles_addr);

        assert!(table::contains(&registry.profiles, sender), EPROFILE_NOT_REGISTERED);

        coin::transfer<AptosCoin>(account, @work_profiles_addr, UPDATE_FEE);

        let data_ref = table::borrow_mut(&mut registry.profiles, sender);
        *&mut data_ref.cid = new_cid;

        emit_event<ProfileUpdatedV4>(
            &mut registry.update_events,
            ProfileUpdatedV4 {
                user: sender,
                cid: *&data_ref.cid,
                cccd: *&data_ref.cccd,
                did: *&data_ref.did,
                timestamp_seconds: timestamp::now_seconds(),
            },
        );
    }

    public entry fun transfer_ownership(account: &signer, new_owner: address) acquires ProfileRegistryV4 {
        let sender = signer::address_of(account);
        let module_owner = @work_profiles_addr;
        assert!(exists<ProfileRegistryV4>(module_owner), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global_mut<ProfileRegistryV4>(module_owner);
        assert!(table::contains(&registry.profiles, sender), ENOT_PROFILE_OWNER);
        let pdata = table::remove(&mut registry.profiles, sender);
        table::add(&mut registry.profiles, new_owner, pdata);
        emit_event<ProfileOwnershipTransferred>(
            &mut registry.transfer_events,
            ProfileOwnershipTransferred {
                from: sender,
                to: new_owner,
                timestamp_seconds: timestamp::now_seconds(),
            }
        );
    }

    public fun get_profile_cid(user: address): String acquires ProfileRegistryV4 {
        let module_owner = @work_profiles_addr;
        assert!(exists<ProfileRegistryV4>(module_owner), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global<ProfileRegistryV4>(module_owner);
        assert!(table::contains(&registry.profiles, user), EPROFILE_NOT_REGISTERED);
        let pdata_ref = table::borrow(&registry.profiles, user);
        pdata_ref.cid
    }

    public fun get_profile_data(user: address): ProfileData acquires ProfileRegistryV4 {
        let module_owner = @work_profiles_addr;
        assert!(exists<ProfileRegistryV4>(module_owner), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global<ProfileRegistryV4>(module_owner);
        assert!(table::contains(&registry.profiles, user), EPROFILE_NOT_REGISTERED);
        *table::borrow(&registry.profiles, user)
    }

    public fun has_profile(user: address): bool acquires ProfileRegistryV4 {
        let module_owner = @work_profiles_addr;
        if (!exists<ProfileRegistryV4>(module_owner)) {
            return false;
        };
        let registry = borrow_global<ProfileRegistryV4>(module_owner);
        table::contains(&registry.profiles, user)
    }
}