<script lang="ts">
    import { onMount } from "svelte";
    import {
        getEpochSeconds,
        type GameData,
        formatDuration,
    } from "../roulette";

    export let game_data: GameData;

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
Submit the URL of an e621 post.
<input type="text" id="link-entry" placeholder="e621.net/posts/1234567" />
<button id="confirm-submission">Submit</button>
