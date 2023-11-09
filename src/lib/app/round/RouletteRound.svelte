<div id="ballot">
    <h1 class="countdown"><span id="ballot-countdown">30</span>s</h1>
    <h1 class="vote-counter">
        <span id="ballot-vote-counter">2/5</span> players have voted
    </h1>
    <!-- need to be interleaved to allow css to style selected -->
    <img src="" alt="" />
    <input type="radio" name="vote-choice" id="vc1" />
    <label for="vc1">
        <div>choice 1</div>
    </label>

    <input type="radio" name="vote-choice" id="vc2" />
    <label for="vc2">
        <div>choice 2</div>
    </label>

    <input type="radio" name="vote-choice" id="vc3" />
    <label for="vc3">
        <div>choice 3</div>
    </label>
</div>

<div id="round-result">
    <div>
        It was <span id="whodunnit" />!
    </div>

    <div>
        Your score is now <span id="score" />.
    </div>
</div>
