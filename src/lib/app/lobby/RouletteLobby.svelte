<script lang="ts">
    import { DocumentReference, updateDoc } from "@firebase/firestore";
    import { GameData, GameState, submission_wait_time_m } from "../roulette";

    export let game_data: GameData;

    async function onStartGame() {
        // Can only be pressed if the user was the owner
        let phase_end_time = new Date();
        phase_end_time.setMinutes(
            phase_end_time.getMinutes() + submission_wait_time_m
        );

        // Only progress with valid room ref
        if (game_data.room_ref instanceof DocumentReference)
            await updateDoc(game_data.room_ref, {
                phase: GameState.Submission,
                phase_end_time,
            });
    }
</script>

<h2 id="room-code-label">{game_data.room_code}</h2>
<span id="lobby-player-count"
    >{game_data.room_data.players.length.toString()}</span
>
Players!
<ul id="player-list">
    {#each game_data.room_data.players as player}
        <li>{player}</li>
    {/each}
</ul>
{#if game_data.room_data.owner == game_data.nickname}
    <button id="start-game" on:click={onStartGame}>Start Game</button>
{:else}
    <div>
        Only <b id="room-owner-label">{game_data.room_data.owner}</b> can start the
        game!
    </div>
{/if}
