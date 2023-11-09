<script lang="ts">
    import {
        GameData,
        GameState,
        ballot_wait_time_m,
        deleteGameCookie,
        getCookie,
        getEpochSeconds,
        getGameCookie,
    } from "./roulette";

    import RouletteMenu from "./menu/RouletteMenu.svelte";
    import RouletteLobby from "./lobby/RouletteLobby.svelte";
    import RouletteSubmission from "./submission/RouletteSubmission.svelte";
    import RouletteRound from "./round/RouletteRound.svelte";
    import RouletteResults from "./results/RouletteResults.svelte";

    // Firebase config
    import { initializeApp } from "@firebase/app";

    import {
        getFirestore,
        collection,
        type DocumentData,
        updateDoc,
        DocumentReference,
        doc,
        onSnapshot,
        getDoc,
        arrayRemove,
        deleteDoc,
    } from "@firebase/firestore";
    import { onMount } from "svelte";

    // Your web app's Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyAziDznLeAce4jycosDFPySUb5EQx9I9CM",
        authDomain: "yiff-roulette.firebaseapp.com",
        projectId: "yiff-roulette",
        storageBucket: "yiff-roulette.appspot.com",
        messagingSenderId: "987270212794",
        appId: "1:987270212794:web:51ebfb8cd88900ff72a683",
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const rooms_ref = collection(db, "rooms");

    let error: string = "";
    let error_timer: NodeJS.Timeout;
    /// Set error popup
    function setError(message: string) {
        const prefixed_message = `Error: ${message}`;
        console.log(prefixed_message);

        // Update the error message
        error = message;

        // Reset the timer if it's already running
        clearTimeout(error_timer);

        // Start a new timer to clear the error message
        error_timer = setTimeout(() => {
            error = "";
        }, 30000); // 30 seconds
    }

    /// Valid room phases
    /// Intended transitions are:
    /// 1. Menu (start) -> Lobby (join or create)
    /// 2. Lobby -> Submission (host start)
    /// 3a. Submission -> AwaitOthers (not all submissions received)
    ///     OR
    /// 3b. Submission -> Vote (all submissions received)
    /// 4. AwaitOthers -> Vote (all submissions received)
    /// 5. Vote -> Results (all votes cast)
    /// 6a. Results -> Vote (more players to vote on)
    ///     OR
    /// 6b. Results -> Summary (all submissions voted)
    /// 7a. Results -> Menu (exit game)
    ///     OR
    /// 7b. Results -> Lobby (play again)
    let game_data: GameData = new GameData();

    function doOwnerTasks() {
        switch (game_data.room_data.phase) {
            case GameState.Lobby: {
                break;
            }
            case GameState.Submission: {
                // If it's time to go to the next phase, do so:
                const time_s =
                    game_data.room_data.phase_end_time.getSeconds() -
                    getEpochSeconds();
                if (time_s <= 0) {
                    let curr_time = new Date();
                    game_data.room_data.phase_end_time.setMinutes(
                        curr_time.getMinutes() + ballot_wait_time_m
                    );
                    // Only update if we have a valid reference
                    if (game_data.room_ref instanceof DocumentReference) {
                        updateDoc(game_data.room_ref, {
                            room_data: game_data.room_data,
                        });
                    }
                }
                break;
            }
            case GameState.Round:
                // Handle round transitions
                const time_s =
                    game_data.room_data.phase_end_time.getSeconds() -
                    getEpochSeconds();
                if (time_s <= 0) {
                    let curr_time = new Date();
                    game_data.room_data.phase_end_time.setMinutes(
                        curr_time.getMinutes() + ballot_wait_time_m
                    );
                    // Only update if we have a valid reference
                    if (game_data.room_ref instanceof DocumentReference) {
                        updateDoc(game_data.room_ref, {
                            room_data: game_data.room_data,
                        });
                    }
                }
                break;
            default: {
                // This case raises an error in applySnap, don't bother reporting it here
                break;
            }
        }
    }

    // Sets the gamestate based on the contents of a room snapshot
    function syncRoomData(snap: DocumentData) {
        // If we are now the owner, make sure the owner tasks are running
        if (
            snap.owner == game_data.nickname &&
            game_data.room_data.owner_timer == null
        ) {
            game_data.room_data.owner_timer = window.setInterval(
                doOwnerTasks,
                1000
            );
        }

        let phase_end_time = snap.phase_end_time;
        if (phase_end_time) {
            phase_end_time = new Date(phase_end_time.seconds * 1000);
        }

        game_data.room_data = {
            players: snap.players,
            owner: snap.owner,
            owner_timer: snap.owner_timer,
            phase: snap.phase,
            phase_end_time,
            created_time: snap.created_time,
            submissions: snap.submissions,
            votes: snap.votes,
        };
    }

    /// Set the active game
    function setGame(room_code: string, nickname: string) {
        game_data.room_code = room_code;
        game_data.nickname = nickname;
        // Fetch room doc reference
        game_data.room_ref = doc(rooms_ref, room_code);
        game_data.unsub = onSnapshot(doc(rooms_ref, room_code), (snap) => {
            // Check doc result
            if (snap.exists()) {
                // Apply existing room snapshot
                syncRoomData(snap.data());
            } else {
                // Unset all data, throw an error, and return to menu
                setError(
                    "The room you were in was deleted. This could be caused by the room being too old (>24hrs), a connectivity issue, or a bug."
                );
            }
        });
    }

    async function onExitRoom() {
        if (game_data.unsub) {
            // Unsubscribe immediately to prevent our exit logic from calling event
            // handlers
            game_data.unsub();
            deleteGameCookie();

            if (game_data.room_ref instanceof DocumentReference) {
                const snap = await getDoc(game_data.room_ref);
                if (snap.exists()) {
                    // Transfer ownership to someone random who isn't the owner:
                    const new_owner = snap
                        .data()
                        .players.find(
                            (name: string) => name != game_data.nickname
                        );
                    if (new_owner) {
                        await updateDoc(game_data.room_ref, {
                            owner: new_owner,
                            players: arrayRemove(game_data.nickname),
                        });
                    } else {
                        // If new_owner is undefined, then we're the only player.
                        // Delete the room from the server and let cleanup continue
                        await deleteDoc(game_data.room_ref);
                    }
                } else {
                    // If we can't even read the gamestate, the game is corrupt and we
                    // just leave.
                    setError(
                        `Failed to transfer room ownership - The game you were playing in might now be corrupt. This could be caused by network issues or a bug. <a href="https://github.com/deerpets/yiff-roulette/issues/new">Open an issue on yiff-roulette's GitHub</a> if you believe this is a bug.`
                    );
                }
            }
            game_data.room_data.phase = GameState.Menu;
        }
    }

    function loadCookies() {
        let nickname_cookie = getCookie("nickname");
        if (typeof nickname_cookie == "string") {
            game_data.nickname = nickname_cookie;
        }
        let room_code_cookie = getCookie("room_code");
        if (typeof room_code_cookie == "string") {
            game_data.room_code = room_code_cookie;
        }
    }
    onMount(loadCookies);
</script>

<header>
    <h1>yiff roulette</h1>
    <button
        id="exit-room"
        class={game_data.room_data.phase == GameState.Menu ? "hide" : ""}
        on:click={onExitRoom}>exit room</button
    >
</header>

<details id="error-display" class={error == "" ? "no-error" : ""}>
    <summary>Error</summary>
    <span>{error}</span>
</details>

<main>
    {#if game_data.room_data.phase == GameState.Menu}
        <RouletteMenu
            nickname={game_data.nickname}
            entered_room_code={game_data.room_code}
            {rooms_ref}
            {setError}
            {setGame}
        />
    {:else if game_data.room_data.phase == GameState.Lobby}
        <RouletteLobby {game_data} />
    {:else if game_data.room_data.phase == GameState.Submission}
        <RouletteSubmission {game_data} {setError} />
    {:else if game_data.room_data.phase == GameState.Round}
        <RouletteRound {game_data} />
    {:else if game_data.room_data.phase == GameState.Results}
        <RouletteResults />
    {/if}
</main>

<footer>made by furries</footer>
