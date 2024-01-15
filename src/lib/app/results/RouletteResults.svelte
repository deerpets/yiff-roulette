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
        // let playersWithSubmissions = game_data.room_data.players.filter(
        //     (player) => game_data.room_data.submissions.has(player)
        // );

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

    // The returned key ordering from firebase doesn't seem to be consistent -
    // but the player join order definitely will be.
    // we use a filter like this to preserve the order of the players array
    let playersWithSubmissions = game_data.room_data.players.filter(
        (player) => game_data.room_data.submissions.has(player)
    );

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

    function votedForWho(voter: string): string {
        let round_votes = game_data.room_data.votes.get(voting_round);
        if (round_votes) {
            return "voted for " + round_votes?.get(voter)
        } else {
            return "didn't vote!"
        }
    }
</script>

<div id="ballot">
    <h1 class="round-counter">Round {voting_round} Results</h1>
    <h1 class="countdown">{formatDuration(remaining_seconds)} remaining</h1>
    <h2>
        {playersWithSubmissions[voting_round]}'s submission:
    </h2>
    <img src={submission_url} alt="some (probably) hot yiff" height="400" />
    {#each game_data.room_data.players as player}
        {player} {votedForWho(player)}
    {/each}
</div>