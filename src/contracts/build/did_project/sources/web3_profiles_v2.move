module work_profiles_addr::web3_profiles_v2 {

    use std::signer;
    use std::string::{String};
    use aptos_framework::event::{EventHandle, emit_event};
    use aptos_std::table;
    use aptos_framework::timestamp;
    use aptos_framework::account;

    const EPROFILE_NOT_REGISTERED: u64 = 1;
    const ENOT_PROFILE_OWNER: u64 = 2;
    const EMODULE_NOT_INITIALIZED: u64 = 3;

    struct ProfileRegistryV2 has key {
        profiles: table::Table<address, ProfileData>,
        update_events: EventHandle<ProfileUpdated>,
        transfer_events: EventHandle<ProfileOwnershipTransferred>,
    }

    struct ProfileData has copy, drop, store {
        cid: String,
        cccd: u64,
    }

    struct ProfileUpdated has drop, store {
        user: address,
        cid: String,
        cccd: u64,
        timestamp_seconds: u64,
    }

    struct ProfileOwnershipTransferred has drop, store {
        from: address,
        to: address,
        timestamp_seconds: u64,
    }

    public entry fun initialize(sender: &signer) {
        let registry = ProfileRegistryV2 {
            profiles: table::new<address, ProfileData>(),
            update_events: account::new_event_handle<ProfileUpdated>(sender),
            transfer_events: account::new_event_handle<ProfileOwnershipTransferred>(sender),
        };
        move_to(sender, registry);
    }

    public entry fun update_profile(account: &signer, cid: String, cccd: u64) acquires ProfileRegistryV2 {
        let sender = signer::address_of(account);
        assert!(exists<ProfileRegistryV2>(@work_profiles_addr), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global_mut<ProfileRegistryV2>(@work_profiles_addr);
        let pdata = ProfileData { cid: cid, cccd: cccd };
        emit_event<ProfileUpdated>(
            &mut registry.update_events,
            ProfileUpdated {
                user: sender,
                cid: pdata.cid,
                cccd: pdata.cccd,
                timestamp_seconds: timestamp::now_seconds(),
            },
        );
        if (table::contains(&registry.profiles, sender)) {
            let data_ref = table::borrow_mut(&mut registry.profiles, sender);
            *data_ref = pdata;
        } else {
            table::add(&mut registry.profiles, sender, pdata);
        };
    }

    public entry fun transfer_ownership(account: &signer, new_owner: address) acquires ProfileRegistryV2 {
        let sender = signer::address_of(account);
        let module_owner = @work_profiles_addr;
        assert!(exists<ProfileRegistryV2>(module_owner), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global_mut<ProfileRegistryV2>(module_owner);
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

    public fun get_profile_cid(user: address): String acquires ProfileRegistryV2 {
        let module_owner = @work_profiles_addr;
        assert!(exists<ProfileRegistryV2>(module_owner), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global<ProfileRegistryV2>(module_owner);
        assert!(table::contains(&registry.profiles, user), EPROFILE_NOT_REGISTERED);
        let pdata_ref = table::borrow(&registry.profiles, user);
        pdata_ref.cid
    }

    public fun get_profile_data(user: address): ProfileData acquires ProfileRegistryV2 {
        let module_owner = @work_profiles_addr;
        assert!(exists<ProfileRegistryV2>(module_owner), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global<ProfileRegistryV2>(module_owner);
        assert!(table::contains(&registry.profiles, user), EPROFILE_NOT_REGISTERED);
        *table::borrow(&registry.profiles, user)
    }

    public fun has_profile(user: address): bool acquires ProfileRegistryV2 {
        let module_owner = @work_profiles_addr;
        if (!exists<ProfileRegistryV2>(module_owner)) {
            return false;
        };
        let registry = borrow_global<ProfileRegistryV2>(module_owner);
        table::contains(&registry.profiles, user)
    }
}