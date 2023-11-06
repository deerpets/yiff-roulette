// Import the functions you need from the SDKs you need
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

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

function setRoomCodeCookie(room_code) {
    const now = new Date();
    now.setTime(now.getTime() + (24 * 60 * 60 * 1000)); // Set the expiry time to 24 hours from now
    const expires = "expires=" + now.toUTCString();

    document.cookie = `room_code=${room_code};SameSite=Lax;${expires};path=/`;
}

async function createRoom() {
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
            await setDoc(doc(roomsRef, room_code), {
                players: ["current player"],
                createdTime: serverTimestamp()
            });
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
let errorTimer;
let all_pages;

function setError(message) {
    const prefixed_message = `Error: ${message}`;
    console.log(prefixed_message);
    error_display.summary.innerText = prefixed_message;

    // Update the error message
    error_display.span.innerText = message;

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
    error_display = geid("error-display");
    error_display.summary = error_display.querySelector("summary");
    error_display.span = error_display.querySelector("span");

    menu = geid("menu");
    menu.code_entry = geid("code-entry");
    menu.join_button = geid("join-room");
    menu.create_button = geid("create-room");
    menu.nickname = geid("nickname")

    lobby = geid("lobby");
    lobby.player_count_label = geid("lobby-player-count");
    lobby.start_button = geid("start-game");
    lobby.room_owner_label = geid("room-owner-label");

    submission = geid("submission");

    round = geid("round");

    round.ballot = geid("ballot");
    round.result = geid("round-result");

    game_results = geid("game-results");

    all_pages = [menu, lobby, submission, round, round.ballot, round.result, game_results];

    // Don't hide the error message if the user inspects it
    error_display.addEventListener('toggle', () => {
        // Clear the existing timer when the error is viewed
        clearTimeout(errorTimer);

        console.log(error_display.open)
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

    lobby.start_button.addEventListener("click", () => showPage(submission));

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

async function onCreateRoom() {
    // Lock the menu UI while we try to connect:
    menu.create_button.disabled = true;
    menu.join_button.disabled = true;
    menu.code_entry.disabled = true;

    const req = await createRoom();

    if (req.success) {
        setRoomCodeCookie(req.room_code);
        showPage(lobby);
    } else {
        setError(req.message);
    }

    // Restore the menu UI now that it's hidden (or to let the user retry)
    onCodeEntryInput();
    menu.create_button.disabled = true;
    menu.join_button.disabled = true;
    menu.code_entry.disabled = true;
}

function showPage(page) {
    all_pages.forEach(page => {
        page.classList.add("hide");
    });

    page.classList.remove("hide");

    // the voting and results pages are subpages of `round`. This
    // shim ensures that `round` is displayed when a subpage is shown.
    page.parentElement.classList.remove("hide");
}

// Check if the user is already in a room (i.e. their cookie is set to a valid
// room code). If so, make the UI match the game state.
async function restoreSession() {
    const room_code = getCookie("room_code");
    if (room_code == null) {
        return;
    }

    if (!isValidRoomCode(room_code)) {
        setError(`The room code in your cookie, "${room_code}", is not in the correct format. This won't cause any problems for you, but might be a bug in yiff-roulette. Clear your cookies (or wait a day) to remove this message - and <a href="https://github.com/deerpets/yiff-roulette/issues/new">open an issue on yiff-roulette's GitHub</a> if you believe this is a bug.`);
        return;
    }

    const room_snap = await getDoc(doc(roomsRef, room_code));
    if (room_snap.exists()) {
        showPage(lobby);
    }

    // Note: The room code cookie is only given 24 hours before it expires, and failing
    // to load a room doesn't cause problems. There's no need to explicitly delete the
    // cookie if it's invalid.
}

window.setError = setError;
window.getCookie = getCookie;
window.setRoomCodeCookie = setRoomCodeCookie;