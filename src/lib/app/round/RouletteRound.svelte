<script lang="ts">
    import { DocumentReference, updateDoc } from "@firebase/firestore";
    import {
        getEpochSeconds,
        type GameData,
        GameState,
        formatDuration,
    } from "../roulette";
    import { onMount } from "svelte";

    export let game_data: GameData;
    export let round_number = 0;

    let remaining_seconds =
        Math.floor(game_data.room_data.phase_end_time.getTime() / 1000) -
        getEpochSeconds();

    function setPhaseTimer() {
        window.setInterval(() => {
            remaining_seconds =
                Math.floor(
                    game_data.room_data.phase_end_time.getTime() / 1000
                ) - getEpochSeconds();
        }, 1000);
    }
    onMount(setPhaseTimer);

    let players_voted = 0;
    let player_vote = "";

    // Durstenfeld Shuffle
    function shuffleArray(array: Array<any>) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    let submission_vote_order = [...game_data.room_data.submissions.keys()];
    shuffleArray(submission_vote_order);
    let submission_url = "";
    fetch(
        `https://e621.net/posts/${game_data.room_data.submissions.get(
            submission_vote_order[round_number]
        )}.json`
    )
        .then((response) => response.json())
        .then((data) => {
            // Process and display the data in your app
            submission_url = data.post.file.url;
        })
        .catch((error) => {
            // Handle any errors
            console.error("Error fetching data: ", error);
        });

    let round_votes = game_data.room_data.votes.get(round_number);
    function calculatePlayerVotes() {
        players_voted = 0;
        if (round_votes instanceof Map) {
            round_votes.forEach((_player, guess) => {
                if (guess != "") {
                    players_voted += 1;
                }
            });
        }
    }

    async function updatePlayerVote() {
        round_votes = game_data.room_data.votes.get(round_number);
        if (!(round_votes instanceof Map)) {
            round_votes = new Map();
        }
        round_votes.set(game_data.nickname, player_vote);
        if (game_data.room_ref instanceof DocumentReference) {
            await updateDoc(game_data.room_ref, {
                [`votes.${round_number}`]: round_votes,
            });
        }
        calculatePlayerVotes();
    }
</script>

<div id="ballot">
    <h1 class="round-counter">Round {round_number}</h1>

    {#if remaining_seconds > 0}
        <h1 class="countdown">{formatDuration(remaining_seconds)} remaining</h1>
    {/if}
    <h2 class="vote-counter">
        {players_voted}/{game_data.room_data.players.length} players have voted
    </h2>
    <img src={submission_url} alt="some (probably) hot yiff" height="400" />
    {#if remaining_seconds > 0}
        {#each game_data.room_data.players as player}
            <input
                type="radio"
                name="vote-choice"
                id="vc-{player}"
                value={player}
                bind:group={player_vote}
                on:change={updatePlayerVote}
            />
            <label for="vc-{player}">
                <div>{player}</div>
            </label>
        {/each}
    {:else}
        <div id="round-result">
            <div>
                It was {submission_vote_order[round_number]}!
            </div>
        </div>
    {/if}
</div>
