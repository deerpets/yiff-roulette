// Import the functions you need from the SDKs you need
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, updateDoc, getDoc, serverTimestamp, onSnapshot, arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAziDznLeAce4jycosDFPySUb5EQx9I9CM",
    authDomain: "yiff-roulette.firebaseapp.com",
    projectId: "yiff-roulette",
    storageBucket: "yiff-roulette.appspot.com",
    messagingSenderId: "987270212794",
    appId: "1:987270212794:web:51ebfb8cd88900ff72a683"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const roomsRef = collection(db, "rooms");

// A-Za-z0-9, but with confusing symbols removed (i.e. o, O, and 0 look similar and are
// thus all removed)
const room_code_alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const room_code_length = 5;

function generateRoomCode() {
    const alphabet_length = room_code_alphabet.length;
    let result = '';

    for (let i = 0; i < room_code_length; i++) {
        result += room_code_alphabet.charAt(Math.floor(Math.random() * alphabet_length));
    }

    return result;
}

function isValidRoomCode(room_code) {
    // Regex could do this in like two lines, but this way we keep our room code alphabet
    // const forcefully synced with the actual validation.
    if (room_code.length !== room_code_length) {
        return false;
    }

    for (let char of room_code) {
        if (!room_code_alphabet.includes(char)) {
            return false;
        }
    }

    return true;
}

function getCookie(name) {
    let cookieArray = document.cookie.split(';');

    for (let i = 0; i < cookieArray.length; i++) {
        let cookiePair = cookieArray[i].split('=');

        // Remove whitespace at the beginning of the cookie name
        // and compare it with the given string
        if (name === cookiePair[0].trim()) {
            // Decode the cookie value and return it
            return decodeURIComponent(cookiePair[1]);
        }
    }

    // Return null if not found
    return null;
}

function setGameCookie(room_code, nickname) {
    const now = new Date();
    now.setTime(now.getTime() + (24 * 60 * 60 * 1000)); // Set the expiry time to 24 hours from now
    const expires = "expires=" + now.toUTCString();
    const samesite = "SameSite=Lax";

    document.cookie = `room_code=${room_code};${samesite};${expires};path=/`;
    document.cookie = `nickname=${nickname};${samesite};${expires};path=/`;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;SameSite=Lax;path=/`;
}

function deleteGameCookie() {
    deleteCookie("room-code")
    deleteCookie("nickname")
}

function getGameCookie() {
    return { room_code: getCookie("room_code"), nickname: getCookie("nickname") }
}

async function createRoom(data) {
    const max_tries = 5;
    let room_code;

    for (let i = 0; i < max_tries; i++) {
        room_code = generateRoomCode();

        try {
            const room_snap = await getDoc(doc(roomsRef, room_code));
            if (room_snap.exists()) {
                continue; // Skip to the next iteration and try a new room code.
            }
        } catch (error) {
            return { success: false, message: 'Failed to check if a room code was already used.', error };
        }

        try {
            await setDoc(doc(roomsRef, room_code), data);
            return { success: true, room_code: room_code }; // Success
        } catch (error) {
            return { success: false, message: 'Failed to create room despite having an available room code.', error };
        }
    }

    return { success: false, message: `Failed to find an unused room code after ${max_tries} attempts.` };
}

function getVoteChoice() {
    const choices = document.querySelectorAll('input[name="vote-choice"]');
    for (const choice of choices) {
        if (choice.checked) {
            return choice.id; // or choice.value if you set value attributes to your inputs
        }
    }
    return null; // in case no button is selected
}

window.createRoom = createRoom;
window.generateRoomCode = generateRoomCode;
window.getVoteChoice = getVoteChoice;

let menu;
let lobby;
let submission;
let round;
let game_results;
let error_display;
let exit_room_button;
let errorTimer;
let all_pages;
let phase_timer;
let owner_timer;

// Give the players 5 minutes to find a submission
const submission_wait_time_m = 5;

// The Unsubscribe object generated by the onSnapshot function for watching
// the state of the current game.
let game = {
    unsub: null,
    room_code: null,
    room_ref: null,
    phase: "menu",
    nickname: ""
}

function setError(message) {
    const prefixed_message = `Error: ${message}`;
    console.log(prefixed_message);
    error_display.summary.innerHTML = prefixed_message;

    // Update the error message
    error_display.span.innerHTML = message;

    // If the error display is open, the user is probably looking at the
    // error. So we don't start a timer to hide it - the toggle eventhandler
    // will fix that when they close the error box.
    if (!error_display.open) {
        // Make the error box visible by removing the 'no-error' class
        error_display.classList.remove('no-error');

        // Reset the timer if it's already running
        clearTimeout(errorTimer);

        // Start a new timer
        errorTimer = setTimeout(() => {
            // Check if the details element is still open before hiding it
            if (!error_display.open) {
                error_display.classList.add('no-error');
            }
        }, 30000); // 30 seconds
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const geid = document.getElementById.bind(document);

    exit_room_button = geid("exit-room");

    error_display = geid("error-display");
    error_display.summary = error_display.querySelector("summary");
    error_display.span = error_display.querySelector("span");

    menu = geid("menu");
    menu.code_entry = geid("code-entry");
    menu.join_button = geid("join-room");
    menu.create_button = geid("create-room");
    menu.nickname = geid("nickname")
    menu.phase_name = "menu"

    lobby = geid("lobby");
    lobby.player_count_label = geid("lobby-player-count");
    lobby.start_button = geid("start-game");
    lobby.room_owner_label = geid("room-owner-label");
    lobby.room_code_label = geid("room-code-label");
    lobby.player_list = geid("player-list")
    lobby.phase_name = "lobby";

    submission = geid("submission");
    submission.countdown = geid("submission-countdown");
    submission.link_entry = geid("link-entry");
    submission.confirm_button = geid("confirm-submission");
    submission.phase_name = "lobby";

    round = geid("round");
    round.phase_name = "round";

    round.ballot = geid("ballot");
    round.ballot.phase_name = "ballot";
    round.result = geid("round-result");
    round.result.phase_name = "round-result";

    game_results = geid("game-results");
    game_results.phase_name = "results"

    all_pages = [menu, lobby, submission, round, round.ballot, round.result, game_results];

    exit_room_button.addEventListener("click", onExitRoom);
    // Don't hide the error message if the user inspects it
    error_display.addEventListener('toggle', () => {
        // Clear the existing timer when the error is viewed
        clearTimeout(errorTimer);

        if (!error_display.open) {
            // If the details has been closed, start a new timer to wait for an extra 10 seconds
            errorTimer = setTimeout(() => {
                error_display.classList.add('no-error');
            }, 10000); // 10 seconds (they explicitly closed it, so we don't wait as long)
        }
    });

    // Bind the menu UI:
    menu.nickname.addEventListener("input", onNicknameInput);
    menu.create_button.addEventListener("click", onCreateRoom);
    menu.join_button.addEventListener("click", onJoinRoom);

    lobby.start_button.addEventListener("click", onStartGame);

    // Bind the submission UI
    geid("confirm-submission").addEventListener("click", () => {
        console.log("submitted");
        showPage(round.ballot);
    });

    menu.code_entry.addEventListener("input", onCodeEntryInput);

    // In case the browser autofills something at pageload, we want to make sure
    // the code entry is properly handled. Same for nickname and other inputs
    onNicknameInput();
    onCodeEntryInput();

    restoreSession();
})

function isNicknameValid(nickname) {
    // TODO: check if nickname passes sanitization rules (i.e. no
    // xss)
    return nickname.length > 0;
}

function onNicknameInput() {
    let nickname = menu.nickname.value;

    if (isNicknameValid(nickname)) {
        menu.create_button.disabled = false;
        onCodeEntryInput();
    } else {
        menu.create_button.disabled = true;
        menu.join_button.disabled = true;
    }
}

async function onExitRoom() {
    if (game.unsub) {
        // Unsubscribe immediately to prevent our exit logic from calling event
        // handlers
        game.unsub();
        deleteGameCookie();

        const snap = await getDoc(game.room_ref);
        if (snap.exists()) {
            // Transfer ownership to someone random who isn't the owner:
            const new_owner = snap.data().players.find(name => name != game.nickname);
            if (new_owner) {
                await updateDoc(game.room_ref, { owner: new_owner, players: arrayRemove(game.nickname) });
            } else {
                // If new_owner is undefined, then we're the only player.
                // Delete the room from the server and let cleanup continue
                await deleteDoc(game.room_ref);
            }
        } else {
            // If we can't even read the gamestate, the game is corrupt and we
            // just leave.
            setError(`Failed to transfer room ownership - The game you were playing in might now be corrupt. This could be caused by network issues or a bug. <a href="https://github.com/deerpets/yiff-roulette/issues/new">Open an issue on yiff-roulette's GitHub</a> if you believe this is a bug.`);
        }

        game.unsub = null;
        game.room_code = null;
        game.nickname = null;
        showPage(menu);
    }
}

function onCodeEntryInput() {
    let code_text = menu.code_entry.value;
    let valid = isValidRoomCode(code_text);
    // The code entry should be valid if the code is valid
    menu.code_entry.classList.toggle("invalid", !valid);

    // But the user can't press the join button unless they also
    // have a nickname
    let nickname = menu.nickname.value;
    menu.join_button.disabled = !(valid && isNicknameValid(nickname));
}

function setMenuLock(lock) {
    menu.code_entry.disabled = lock;

    if (lock == true) {
        // It's always safe to lock the buttons
        menu.join_button.disabled = lock;
        menu.create_button.disabled = lock;
    } else {
        // But if we're unlocking, we need to call the event handlers responsible for
        // managing button state. It's possible the buttons shouldn't be reenabled
        onNicknameInput();
        onCodeEntryInput();
    }
}

function setGame(room_code, nickname) {
    game.room_code = room_code;
    game.nickname = nickname;
    game.room_ref = doc(roomsRef, room_code);
    game.unsub = onSnapshot(doc(roomsRef, room_code), doc => {
        if (doc.exists()) {
            applySnap(doc.data());
        } else {
            setError("The room you were in was deleted. This could be caused by the room being too old (24hrs), a connectivity issue, or a bug.");
            game.unsub();
            game.room_code = null;
            game.room_ref = null;
            game.unsub = null;
            game.nickname = null;
            showPage(menu);
        }
    });
}

async function onCreateRoom() {
    // Lock the menu UI while we try to connect:
    setMenuLock(true);

    const data = {
        players: [menu.nickname.value],
        phase: "lobby",
        owner: menu.nickname.value,
        createdTime: serverTimestamp()
    };

    const req = await createRoom(data);

    if (req.success) {
        setGameCookie(req.room_code, menu.nickname.value);
        setGame(req.room_code, menu.nickname.value);
        // TODO: This is probably dumb and hacky but i don't care. this fills out the labels
        // for room size and player count etc
        saturateLobby(data);
    } else {
        setError(req.message);
    }

    // Restore the menu UI now that it's hidden (or to let the user retry)
    setMenuLock(false);
}

async function onJoinRoom() {
    setMenuLock(true);

    const nickname = menu.nickname.value;
    const room_code = menu.code_entry.value;
    const room_ref = doc(roomsRef, room_code);
    const room_snap = await getDoc(room_ref);
    if (room_snap.exists()) {
        await updateDoc(room_ref, { players: arrayUnion(nickname) })
        setGame(room_code, nickname);
    } else {
        setError("The room you attempted to join does not exist!");
    }

    setMenuLock(false);
}

function showPage(page) {
    all_pages.forEach(page => {
        page.classList.add("hide");
    });

    // Hide the exit button if we're on the main menu now - but in all
    // other cases, show it.
    exit_room_button.classList.toggle("hide", page == menu);

    page.classList.remove("hide");

    // the voting and results pages are subpages of `round`. This
    // shim ensures that `round` is displayed when a subpage is shown.
    page.parentElement.classList.remove("hide");

    // Tell the local gamestate what page is currently showing.
    game.phase = page.phase_name;
}

// Check if the user is already in a room (i.e. their cookie is set to a valid
// room code). If so, make the UI match the game state.
async function restoreSession() {
    const cookie = getGameCookie();

    if (cookie.room_code == null || cookie.nickname == null) {
        return;
    }

    if (!isValidRoomCode(cookie.room_code)) {
        setError(`The room code in your cookie, "${cookie.room_code}", is not in the correct format. This won't cause any problems for you, but might be a bug in yiff roulette. Clear your cookies (or wait a day) to remove this message, and <a href="https://github.com/deerpets/yiff-roulette/issues/new">open an issue on yiff-roulette's GitHub</a> if you believe this is a bug.`);
        return;
    }

    if (!isNicknameValid(cookie.nickname)) {
        setError(`The nickname in your cookie, "${cookie.nickname}", is not valid. Join a new game, clear your cookies, or wait a day to remove this message. <a href="https://github.com/deerpets/yiff-roulette/issues/new">Open an issue on yiff-roulette's GitHub</a> if you believe this is a bug.`);
        return;
    }

    const room_ref = doc(roomsRef, cookie.room_code);
    const room_snap = await getDoc(room_ref);
    if (room_snap.exists()) {
        const data = room_snap.data();
        if (data.players.includes(cookie.nickname)) {
            setGame(cookie.room_code, cookie.nickname);
        }
    }

    // Note: The room code cookie is only given 24 hours before it expires, and failing
    // to load a room doesn't cause problems. There's no need to explicitly delete the
    // cookie if it's invalid.
}

async function onStartGame() {
    // Can only be pressed if the user was the owner

    // The submission period is 2 minutes
    let phase_end_time = new Date();
    phase_end_time.setMinutes(phase_end_time.getMinutes() + submission_wait_time_m);

    await updateDoc(game.room_ref, { phase: "submission", phase_end_time });
}

// Sets the gamestate based on the contents of a room snap.
function applySnap(snap) {
    // If we are now the owner, make sure the owner tasks are running
    if (snap.owner == game.nickname && owner_timer == null) {
        owner_timer = window.setInterval(doOwnerTasks, 1000);
    }

    switch (snap.phase) {
        case "lobby": {
            saturateLobby(snap);
            break;
        }
        case "submission": {
            saturateSubmission(snap);
            break;
        }
        default: {
            // TODO: sanitize snap.phase
            setError(`This room is corrupt ("${snap.phase}" is not a valid game phase). <a href="https://github.com/deerpets/yiff-roulette/issues/new">Open an issue on yiff-roulette's GitHub</a> if you weren't expecting this.`)
            break;
        }
    }
}

function saturateLobby(snap) {
    if (snap.phase != game.phase) {
        showPage(lobby);
        // Don't really have to sanitize the room code - it is never pulled
        // from the server, the client has to type it.
        // TOOD: if we use QR codes the above statement will change!
        lobby.room_code_label.innerText = game.room_code;
    }

    lobby.player_count_label.innerText = snap.players.length;
    // TODO: sanitize the owner string

    lobby.player_list.innerHTML = "";
    snap.players.forEach(player_name => {
        const li = document.createElement("li");
        // TODO: sanitize player names
        li.innerText = player_name;
        lobby.player_list.appendChild(li);
    });

    lobby.room_owner_label.innerText = snap.owner;

    const is_owner = game.nickname == snap.owner;
    lobby.room_owner_label.classList.toggle("hide", !is_owner);
    lobby.start_button.classList.toggle("hide", !is_owner); // only the owner can start
}

function getEpochSeconds() {
    return Math.floor(new Date().getTime() / 1000);
}

function formatDuration(time_s) {
    if (time_s < 0) {
        return "too late!";
    } else {
        let s_left = time_s % 60;
        if (time_s < 61) {
            return `${s_left} seconds!!!`;
        } else {
            const m_left = Math.floor(time_s / 60);
            if (s_left < 10) {
                // if only we had `left-pad` we wouldn't have to do this!!
                // noo! why!!!
                s_left = `0${s_left}`;
            }
            return `${m_left}:${s_left}`;
        }
    }
}

function saturateSubmission(snap) {
    if (snap.phase != game.phase) {
        showPage(submission);
    }

    // Manage the timer display. This used to be in the initialization block above,
    // but it's possible that the page doesn't update between round 1 submission and
    // round 2 submission. That would change the timer but not the phase, so we need
    // to reset the timer every snap.
    {
        // Every second, update the time display:
        clearTimeout(phase_timer);
        const updateTimestamp = () => {
            const time_s = snap.phase_end_time.seconds - getEpochSeconds();

            // strictly less than 0 - i want it to display the too late message if
            // the stop time is in the past.
            if (time_s < 0 && phase_timer) {
                clearInterval(phase_timer);
            }

            submission.countdown.innerText = formatDuration(time_s);
        };

        // setInterval won't call it until 1s passes, so there can be flicker if we don't
        // do this
        updateTimestamp();
        phase_timer = window.setInterval(updateTimestamp, 1000);
    }
}

function doOwnerTasks() {
    console.log("owner owner owner")
}

window.setError = setError;
window.getCookie = getCookie;
window.setGameCookie = setGameCookie;