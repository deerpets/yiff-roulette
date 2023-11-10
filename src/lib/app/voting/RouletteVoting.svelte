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

    let voting_round = 0;

    // Keep the voting round tracked but only change it when needed
    $: {
        if (voting_round != game_data.room_data.voting_round) {
            voting_round = game_data.room_data.voting_round;
        }
    }

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

    function showImage(round_id: number) {
        console.log(`voting round changed ${voting_round}`);
        // The returned key ordering doesn't seem to be consistent - but the player order definitely will be.
        // we use a filter like this to preserve the order of the players array
        let playersWithSubmissions = game_data.room_data.players.filter(
            (player) => game_data.room_data.submissions.has(player)
        );

        fetch(
            `https://e621.net/posts/${game_data.room_data.submissions.get(
                playersWithSubmissions[round_id]
            )}.json`
        )
            .then((response) => response.json())
            .then((data) => {
                // Process and display the data in your app
                console.log("data from e6:");
                console.log(data);
                submission_url = data.post.file.url;
            })
            .catch((error) => {
                // Handle any errors
                console.error("Error fetching data: ", error);
            });
    }

    $: {
        showImage(voting_round);
        // Whenever the voting round changes (i.e. like it does here) we want to deselect the radio buttons
        player_vote = "";
    }
    let submission_url = "";

    $: round_votes = game_data.room_data.votes.get(
        game_data.room_data.voting_round
    );
    $: players_voted = countVotes(round_votes);
    function countVotes(votes: Map<string, string> | undefined) {
        let count = 0;
        if (votes instanceof Map) {
            votes.forEach((_player, guess) => {
                if (guess != "") {
                    count += 1;
                }
            });
        }
        return count;
    }

    async function updatePlayerVote() {
        if (game_data.room_ref instanceof DocumentReference) {
            await updateDoc(game_data.room_ref, {
                [`votes.${game_data.room_data.voting_round}.${game_data.nickname}`]:
                    player_vote,
            });
            // If this user is the last person in the room to vote, we skip the timer
            const players_who_voted =
                game_data.room_data.votes.get(voting_round);

            if (players_who_voted?.size == game_data.room_data.players.length) {
                const now_s = getEpochSeconds();
                const phase_end_time: number =
                    game_data.room_data.phase_end_time.getTime() / 1000;
                const phase_end_time_from_now = phase_end_time - now_s;

                if (phase_end_time_from_now > 10) {
                    let new_phase_end = new Date();
                    new_phase_end.setSeconds(new_phase_end.getSeconds() + 10);
                    await updateDoc(game_data.room_ref, {
                        phase_end_time: new_phase_end,
                    });
                    setPhaseTimer();
                }
            }
        }
    }
</script>

<div id="ballot">
    <h1 class="round-counter">Round {game_data.room_data.voting_round}</h1>
    <h1 class="countdown">{formatDuration(remaining_seconds)} remaining</h1>
    <h2 class="vote-counter">
        {players_voted}/{game_data.room_data.players.length} players have voted
    </h2>
    <img src={submission_url} alt="some (probably) hot yiff" height="400" />
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
</div>
