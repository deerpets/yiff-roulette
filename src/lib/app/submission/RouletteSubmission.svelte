<script lang="ts">
    import { getEpochSeconds, type GameData } from "../roulette";

    export let game_data: GameData;

    function formatDuration(time_s: number) {
        if (time_s < 0) {
            return "too late!";
        } else {
            let s_left: string = (time_s % 60).toString();
            if (time_s < 61) {
                return `${s_left} seconds!!!`;
            } else {
                const m_left = Math.floor(time_s / 60);
                if (+s_left < 10) {
                    // if only we had `left-pad` we wouldn't have to do this!!
                    // noo! why!!!
                    s_left = `0${s_left}`;
                }
                return `${m_left}:${s_left}`;
            }
        }
    }

    let remaining_seconds =
        game_data.room_data.phase_end_time.seconds - getEpochSeconds();

    let phase_timer = window.setInterval(() => {
        remaining_seconds =
            game_data.room_data.phase_end_time.seconds - getEpochSeconds();
    }, 1000);
</script>

<h1 id="submission-countdown">
    {formatDuration(remaining_seconds)}
</h1>
Submit the URL of an e621 post.
<input type="text" id="link-entry" placeholder="e621.net/posts/1234567" />
<button id="confirm-submission">Submit</button>
