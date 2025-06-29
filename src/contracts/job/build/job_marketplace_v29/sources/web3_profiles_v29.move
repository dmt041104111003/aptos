module did_addr_profile::web3_profiles_v29 {

    use std::signer;
    use std::string::{Self, String};
    use aptos_framework::event::{EventHandle, emit_event};
    use aptos_std::table;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::coin::{Self};
    use aptos_framework::aptos_coin::AptosCoin;
    use std::vector;

    const EPROFILE_NOT_REGISTERED: u64 = 1;
    const ENOT_PROFILE_OWNER: u64 = 2;
    const EMODULE_NOT_INITIALIZED: u64 = 3;
    const EPROFILE_ALREADY_REGISTERED: u64 = 4;
    const EINVALID_REGISTRATION_CALL: u64 = 5;
    const EINVALID_UPDATE_CALL: u64 = 6;
    const ETINY_FEE_NOT_ENOUGH: u64 = 7;
    const EINVALID_SIGNER_FOR_INIT: u64 = 8;
    const ECANNOT_CHANGE_DID: u64 = 9;
    const EINVALID_CCCD: u64 = 10;
    const EFACE_NOT_VERIFIED: u64 = 11;
    const EFACE_NOT_REAL: u64 = 12;
    const EFACE_DISTANCE_TOO_LARGE: u64 = 13;
    const MAX_TRUST_SCORE: u64 = 100;

    const REGISTRATION_FEE: u64 = 1000;
    const UPDATE_FEE: u64 = 100;

    struct ProfileData has store, copy, drop {
        did: String,
        cccd: String,
        cid: String,
        name: String,
        created_at: u64,
        face_verified: bool,
        distance: u64, 
        is_real: bool,
        processing_time: u64, // ms
        verify_message: String,
        trust_score: u64
    }

    struct Profiles has key {
        profiles: table::Table<address, ProfileData>
    }

    struct Events has key {
        profile_created_event: EventHandle<ProfileCreatedV29>,
        profile_updated_event: EventHandle<ProfileUpdatedV29>
    }

    struct ProfileCreatedV29 has drop, store {
        user: address,
        did: String,
        cccd: String,
        cid: String,
        name: String,
        created_at: u64,
        face_verified: bool,
        distance: u64,
        is_real: bool,
        processing_time: u64,
        verify_message: String,
        trust_score: u64
    }

    struct ProfileUpdatedV29 has drop, store {
        user: address,
        did: String,
        cccd: String,
        cid: String,
        name: String,
        updated_at: u64,
        face_verified: bool,
        distance: u64,
        is_real: bool,
        processing_time: u64,
        verify_message: String,
        trust_score: u64
    }

    fun is_valid_cccd(cccd: &String): bool {
        let bytes = string::bytes(cccd);
        let i = 0;
        let len = vector::length(bytes);
        while (i < len) {
            let byte = *vector::borrow(bytes, i);
            if (byte < 48 || byte > 57) { 
                return false
            };
            i = i + 1;
        };
        true
    }

    fun is_empty(s: &String): bool {
        let bytes = string::bytes(s);
        vector::length(bytes) == 0
    }

    public entry fun register_profile(
        account: &signer,
        did: String,
        cccd: String,
        cid: String,
        name: String,
        face_verified: bool,
        distance: u64, // scaled by 1e6
        is_real: bool,
        processing_time: u64,
        verify_message: String
    ) acquires Profiles, Events {
        let sender = signer::address_of(account);
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(!has_profile(sender), EPROFILE_ALREADY_REGISTERED);
        assert!(is_valid_cccd(&cccd), EINVALID_CCCD);
        assert!(face_verified, EFACE_NOT_VERIFIED);
        assert!(is_real, EFACE_NOT_REAL);

        let profiles = borrow_global_mut<Profiles>(@did_addr_profile);
        let created_at = timestamp::now_seconds();
        let profile = ProfileData {
            did,
            cccd,
            cid,
            name,
            created_at,
            face_verified,
            distance,
            is_real,
            processing_time,
            verify_message,
            trust_score: MAX_TRUST_SCORE
        };
        table::add(&mut profiles.profiles, sender, profile);

        assert!(exists<Events>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        let events = borrow_global_mut<Events>(@did_addr_profile);
        emit_event(
            &mut events.profile_created_event,
            ProfileCreatedV29 {
                user: sender,
                did,
                cccd,
                cid,
                name,
                created_at,
                face_verified,
                distance,
                is_real,
                processing_time,
                verify_message,
                trust_score: MAX_TRUST_SCORE
            }
        );
    }

    public entry fun update_profile(
        account: &signer,
        cid: String,
        name: String,
        face_verified: bool,
        distance: u64,
        is_real: bool,
        processing_time: u64,
        verify_message: String
    ) acquires Profiles, Events {
        let sender = signer::address_of(account);
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(sender), EPROFILE_NOT_REGISTERED);

        let profiles = borrow_global_mut<Profiles>(@did_addr_profile);
        let profile = table::borrow_mut(&mut profiles.profiles, sender);
        let old_did = profile.did;
        let old_cccd = profile.cccd;
        let old_trust_score = profile.trust_score;
        profile.cid = cid;
        profile.name = name;
        profile.face_verified = face_verified;
        profile.distance = distance;
        profile.is_real = is_real;
        profile.processing_time = processing_time;
        profile.verify_message = verify_message;

        assert!(exists<Events>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        let events = borrow_global_mut<Events>(@did_addr_profile);
        emit_event(
            &mut events.profile_updated_event,
            ProfileUpdatedV29 {
                user: sender,
                did: old_did,
                cccd: old_cccd,
                cid: cid,
                name: name,
                updated_at: timestamp::now_seconds(),
                face_verified,
                distance,
                is_real,
                processing_time,
                verify_message,
                trust_score: old_trust_score
            }
        );
    }

    public fun has_profile(user: address): bool acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        let profiles = borrow_global<Profiles>(@did_addr_profile);
        table::contains(&profiles.profiles, user)
    }

    public fun get_profile(user: address): ProfileData acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(user), EPROFILE_NOT_REGISTERED);
        let profiles = borrow_global<Profiles>(@did_addr_profile);
        *table::borrow(&profiles.profiles, user)
    }

    public fun get_profile_did(user: address): String acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(user), EPROFILE_NOT_REGISTERED);
        let profiles = borrow_global<Profiles>(@did_addr_profile);
        let profile = table::borrow(&profiles.profiles, user);
        profile.did
    }

    public fun get_profile_cccd(user: address): String acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(user), EPROFILE_NOT_REGISTERED);
        let profiles = borrow_global<Profiles>(@did_addr_profile);
        let profile = table::borrow(&profiles.profiles, user);
        profile.cccd
    }

    public fun get_profile_cid(user: address): String acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(user), EPROFILE_NOT_REGISTERED);
        let profiles = borrow_global<Profiles>(@did_addr_profile);
        let profile = table::borrow(&profiles.profiles, user);
        profile.cid
    }

    public fun get_profile_name(user: address): String acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(user), EPROFILE_NOT_REGISTERED);
        let profiles = borrow_global<Profiles>(@did_addr_profile);
        let profile = table::borrow(&profiles.profiles, user);
        profile.name
    }

    public entry fun init_events(account: &signer) {
        move_to(account, Events {
            profile_created_event: account::new_event_handle<ProfileCreatedV29>(account),
            profile_updated_event: account::new_event_handle<ProfileUpdatedV29>(account)
        });
    }

    public entry fun initialize(account: &signer) {
        let owner_addr = signer::address_of(account);
        assert!(owner_addr == @did_addr_profile, EINVALID_SIGNER_FOR_INIT);

        if (!exists<Profiles>(owner_addr)) {
            move_to(account, Profiles {
                profiles: table::new<address, ProfileData>()
            });
        };

        if (!exists<Events>(owner_addr)) {
            init_events(account);
        };
    }

    #[view]
    public fun get_profile_by_address(addr: address): ProfileData acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(addr), EPROFILE_NOT_REGISTERED);
        let profiles = borrow_global<Profiles>(@did_addr_profile);
        *table::borrow(&profiles.profiles, addr)
    }

    public fun get_trust_score_by_address(user: address): u64 acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(user), EPROFILE_NOT_REGISTERED);
        let profiles = borrow_global<Profiles>(@did_addr_profile);
        let profile = table::borrow(&profiles.profiles, user);
        profile.trust_score
    }
    
    public entry fun increase_trust_score_with_apt(
        account: &signer,
        apt_amount: u64
    ) acquires Profiles {
        let sender = signer::address_of(account);
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(sender), EPROFILE_NOT_REGISTERED);
        assert!(apt_amount % 10 == 0, ETINY_FEE_NOT_ENOUGH);

        let apt = coin::withdraw<AptosCoin>(account, apt_amount);
        coin::deposit<AptosCoin>(@did_addr_profile, apt);

        let added_score = apt_amount / 10;

        let profiles = borrow_global_mut<Profiles>(@did_addr_profile);
        let profile = table::borrow_mut(&mut profiles.profiles, sender);
        let new_score = profile.trust_score + added_score;
        profile.trust_score = if (new_score > MAX_TRUST_SCORE) {
            MAX_TRUST_SCORE
        } else {
            new_score
        };
    }

    public fun increase_trust_score_from_vote(user: address) acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(user), EPROFILE_NOT_REGISTERED);

        let profiles = borrow_global_mut<Profiles>(@did_addr_profile);
        let profile = table::borrow_mut(&mut profiles.profiles, user);

        let new_score = profile.trust_score + 1;
        profile.trust_score = if (new_score > MAX_TRUST_SCORE) { MAX_TRUST_SCORE } else { new_score };
    }

    fun update_score(addr: address, delta: u64, increase: bool, profiles: &mut Profiles) {
        let profile = table::borrow_mut(&mut profiles.profiles, addr);
        let new_score = if (increase) {
            profile.trust_score + delta
        } else {
            profile.trust_score - delta
        };
        profile.trust_score = if (new_score > MAX_TRUST_SCORE) { MAX_TRUST_SCORE } else { new_score };
    }
    
    public fun update_trust_score_from_vote(
        freelancer: address,
        poster: address,
        winer_is_freelancer: bool
    ) acquires Profiles {
        assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(has_profile(freelancer), EPROFILE_NOT_REGISTERED);
        assert!(has_profile(poster), EPROFILE_NOT_REGISTERED);

        let profiles = borrow_global_mut<Profiles>(@did_addr_profile);

        if (winer_is_freelancer) {
            update_score(freelancer, 5, false,  profiles); 
            update_score(poster, 5, true, profiles);      
        } else {
            update_score(poster, 5, false,  profiles);      
            update_score(freelancer, 5, true, profiles);  
        }
    }
}