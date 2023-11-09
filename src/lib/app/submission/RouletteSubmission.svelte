<script lang="ts">
    import { onMount } from "svelte";
    import { parse } from "svelte/compiler";
    import {
        getEpochSeconds,
        type GameData,
        formatDuration,
    } from "../roulette";
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
    import { updated } from "$app/stores";

    export let game_data: GameData;
    export let setError: Function;

    class E621URLResult {
        success: boolean = false;
        id: number | undefined = undefined;
        message: string | undefined = "";
    }

    function parseE6URL(url: string): E621URLResult {
        let result = url.match(url_regex);

        if (result && result.groups) {
            const id: number = parseInt(result.groups.id);
            if (id) {
                return {
                    success: true,
                    id,
                    message: undefined,
                };
            } else {
                return {
                    success: false,
                    id: undefined,
                    message:
                        "Invalid URL: Failed to parse number? (probably a bug!)",
                };
            }
        }

        return {
            success: false,
            id: undefined,
            message:
                "Invalid URL. Did you accidentally copy the static.e621.net url?",
        };
    }

    function onSubmit() {
        const parsed = parseE6URL(entered_url);
        if (parsed.success && game_data.room_ref) {
            updateDoc(game_data.room_ref, {
                [`submissions.${game_data.nickname}`]: parsed.id,
            });

            // If this user is the last person in the room to make their submission, we skip the timer!
            // This technique is known as "bad access control"
            if (
                game_data.room_data.submissions.size ==
                game_data.room_data.players.length
            ) {
                const now_s = getEpochSeconds();
                const phase_end_time: number =
                    game_data.room_data.phase_end_time.getTime() / 1000;
                const phase_end_time_from_now = phase_end_time - now_s;
                if (phase_end_time_from_now > 10) {
                    let new_phase_end = new Date();
                    new_phase_end.setSeconds(new_phase_end.getSeconds() + 10);
                    updateDoc(game_data.room_ref, {
                        phase_end_time: new_phase_end,
                    });
                }
            }
        } else {
            setError(parsed.message);
        }
    }

    function onLinkEntryInput() {
        valid_url = parseE6URL(entered_url).success;
        console.log(valid_url);
    }

    let entered_url: string = "";
    let valid_url: boolean = false;

    const url_regex: RegExp =
        /^(https?:\/\/)?e621.net\/posts\/(?<id>\d+)(\?.*)?$/;

    let remaining_seconds =
        game_data.room_data.phase_end_time.getSeconds() - getEpochSeconds();

    function setPhaseTimer() {
        let phase_timer = window.setInterval(() => {
            remaining_seconds =
                game_data.room_data.phase_end_time.getSeconds() -
                getEpochSeconds();
        }, 1000);
    }
    onMount(setPhaseTimer);
</script>

<h1 id="submission-countdown">
    {formatDuration(remaining_seconds)}
</h1>
Submit the URL of an e621 post. Just copy the link from the post's page (i.e. https://e621.net/posts/1234567).
<input
    type="text"
    id="link-entry"
    placeholder="https://e621.net/posts/1234567"
    bind:value={entered_url}
    on:input={onLinkEntryInput}
    pattern={url_regex.source}
/>
<button id="confirm-submission" disabled={!valid_url} on:click={onSubmit}
    >Submit</button
>
