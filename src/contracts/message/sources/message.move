module web3_messaging::web3_messaging_v1 {
    use std::string::String;
    use std::signer;
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use std::event;

    // Error codes
    const EMODULE_NOT_INITIALIZED: u64 = 0;

    // Struct to represent a message sent event
    struct MessageSentEvent has drop, store {
        sender: address,
        receiver: address,
        content: String,
        timestamp: u64,
        conversation_id: String, // A unique ID for the conversation (e.g., concatenation of sorted addresses)
    }

    // Resource to hold the event handle for MessageSentEvent
    struct Events has key {
        message_sent_events: event::EventHandle<MessageSentEvent>,
    }

    // Initialize the event handle for the module
    public entry fun init_events(account: &signer) {
        let owner_addr = signer::address_of(account);
        // Ensure this function is called only once by the module owner or deployer
        assert!(owner_addr == @web3_messaging, EMODULE_NOT_INITIALIZED); 

        if (!exists<Events>(owner_addr)) {
            move_to(account, Events {
                message_sent_events: account::new_event_handle<MessageSentEvent>(account),
            });
        };
    }

    // Entry function to send a message
    public entry fun send_message(
        sender: &signer,
        receiver_address: address,
        content: String,
        conversation_id: String // Pass conversation ID from client (e.g., sorted addresses)
    ) acquires Events {
        let sender_address = signer::address_of(sender);
        let current_timestamp = timestamp::now_seconds();

        // Ensure events resource exists
        assert!(exists<Events>(@web3_messaging), EMODULE_NOT_INITIALIZED);
        let events_handle = borrow_global_mut<Events>(@web3_messaging);

        // Emit the MessageSentEvent
        event::emit_event(
            &mut events_handle.message_sent_events,
            MessageSentEvent {
                sender: sender_address,
                receiver: receiver_address,
                content,
                timestamp: current_timestamp,
                conversation_id,
            }
        );
    }

    // Public view function to check if events resource exists (for client-side checks)
    public fun events_initialized(): bool {
        exists<Events>(@web3_messaging)
    }
} 