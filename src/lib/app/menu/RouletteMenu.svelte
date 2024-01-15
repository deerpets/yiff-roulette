<script lang="ts">
    import {
        CollectionReference,
        arrayUnion,
        doc,
        getDoc,
        serverTimestamp,
        setDoc,
        updateDoc,
        type DocumentData,
        onSnapshot,
    } from "@firebase/firestore";
    import {
        GameData,
        GameState,
        RoomData,
        getCookie,
        setGameCookie,
    } from "../roulette";
    import { createEventDispatcher } from "svelte";

    // Module props
    const dispatch = createEventDispatcher();
    let disabled = false;
    export let nickname = "";
    export let entered_room_code = "";
    let valid_room_code = false;
    export let rooms_ref: CollectionReference<DocumentData, DocumentData>;
    export let setError: Function;
    export let setGame: Function;

    /// Generate a new room code at random
    function generateRoomCode() {
        const alphabet_length = room_code_alphabet.length;
        let result = "";

        for (let i = 0; i < room_code_length; i++) {
            result += room_code_alphabet.charAt(
                Math.floor(Math.random() * alphabet_length)
            );
        }

        return result;
    }

    class CreateRoomResult {
        success: boolean = false;
        message: string = "";
        room_code: string | undefined;
    }

    /// Create a new room
    async function createRoom(data: RoomData): Promise<CreateRoomResult> {
        const max_tries = 5;
        let room_code;

        let result = new CreateRoomResult();
        result.success = false;

        for (let i = 0; i < max_tries; i++) {
            room_code = generateRoomCode();
            try {
                const room_snap = await getDoc(doc(rooms_ref, room_code));
                if (room_snap.exists()) {
                    continue; // Skip to the next iteration and try a new room code.
                }
            } catch (error) {
                console.log(error);
                result.message =
                    "Failed to check if a room code was already used.";
                return result;
            }

            try {
                await setDoc(doc(rooms_ref, room_code), data);
                result.success = true;
                result.room_code = room_code;
                return result;
            } catch (error) {
                result.message = `Failed to create room despite having an available room code. (${error})`;
                return result;
            }
        }

        result.message = `Failed to find an unused room code after ${max_tries} attempts.`;
        return result;
    }

    async function onCreateRoom() {
        // Lock the menu UI while we try to connect
        disabled = true;

        // Create data object representing the room
        const data = {
            players: [nickname],
            phase: GameState.Lobby,
            phase_end_time: new Date(),
            owner: nickname,
            owner_timer: 0,
            created_time: serverTimestamp(),
            // TODO: These SHOULD be here, but setdoc rejects custom map objects and will poop the bed.
            // submissions: new Map(),
            // votes: new Map(),
            // This is type violating but works
            submissions: {},
            votes: {},
            voting_round: 0,
        };

        // Attempt to create the room
        const req = await createRoom(data);

        // Handle room creation result
        if (req.success) {
            if (typeof req.room_code === "string") {
                setGameCookie(req.room_code, nickname);
                setGame(req.room_code, nickname);
            }
            dispatch("create");
        } else {
            // On failure, show error popup with failure message
            setError(req.message);
        }

        // Unlock the menu since we are no longer attempting conenction
        disabled = false;
    }

    /// Room join handler
    async function onJoinRoom() {
        // Lock menu while we attempt to join
        disabled = true;

        // Fetch room by code
        const room_code = entered_room_code;
        const room_ref = doc(rooms_ref, room_code);
        const room_snap = await getDoc(room_ref);
        // Handle fetch result
        if (room_snap.exists()) {
            // Add ourselves to the player list
            await updateDoc(room_ref, {
                players: arrayUnion(nickname),
            });
            // Set game state
            setGame(room_code, nickname);
        } else {
            // Return an error popup
            setError("The room you attempted to join does not exist!");
        }

        // Unlock the menu
        disabled = false;
    }

    // Limited set of characters to use when generating a room code
    const room_code_alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ";
    const room_code_length = 5;
    const room_code_regex = new RegExp(
        `^[${room_code_alphabet}]{${room_code_length}}$`
    );
    /// Room code input validation
    function onCodeEntryInput() {
        valid_room_code = room_code_regex.test(entered_room_code);
    }
</script>

First, pick a nickname:
<input
    bind:value={nickname}
    type="text"
    id="nickname"
    placeholder="handlebars 🦌"
/>

Then
<div>
    <button id="create-room" {disabled} on:click={onCreateRoom}
        >Create a Room</button
    >
</div>
<div>or</div>
<div>
    <input
        bind:value={entered_room_code}
        on:input={onCodeEntryInput}
        type="text"
        id="code-entry"
        placeholder="DOEQT"
    />
    <button
        id="join-room"
        disabled={disabled || !valid_room_code}
        on:click={onJoinRoom}>Join With a Room Code</button
    >
</div>
