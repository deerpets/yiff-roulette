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

function setRoomCodeCookie(room_code) {
    const now = new Date();
    now.setTime(now.getTime() + (24 * 60 * 60 * 1000)); // Set the expiry time to 24 hours from now
    const expires = "expires=" + now.toUTCString();

    document.cookie = "room_code=" + room_code + ";" + expires + ";path=/";
}

// Usage
setRoomCodeCookie('yourRoomCodeHere');


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

let lobby;
let submission;
let round;
let game_results;
let error_display;
let errorTimer;

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
    error_display = document.getElementById("error-display");
    error_display.summary = error_display.querySelector("summary");
    error_display.span = error_display.querySelector("span");
    lobby = document.getElementById("lobby");
    lobby.code_entry = document.getElementById("code-entry");
    lobby.join_button = document.getElementById("join-room")
    submission = document.getElementById("submission");
    round = document.getElementById("round");
    round.ballot = document.getElementById("ballot");
    round.result = document.getElementById("round-result");
    game_results = document.getElementById("game-results");

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

    // Bind the lobby UI:
    document.getElementById("create-room").addEventListener("click", () => {
        console.log("create room");
        showPage(submission);
    });

    // Bind the submission UI
    document.getElementById("confirm-submission").addEventListener("click", () => {
        console.log("submitted");
        showPage(round.ballot);
    });

    lobby.code_entry.addEventListener("input", onCodeEntryInput);

    // In case the browser autofills something at pageload, we want to make sure
    // the code entry is properly handled.
    onCodeEntryInput();
})

function onCodeEntryInput() {
    let code_text = lobby.code_entry.value;
    let valid = isValidRoomCode(code_text);

    lobby.join_button.disabled = !valid;
    lobby.code_entry.classList.toggle("invalid", !valid);
}

function showPage(page) {
    lobby.classList.add("hide");
    submission.classList.add("hide");
    round.classList.add("hide");
    round.ballot.classList.add("hide");
    round.result.classList.add("hide");

    game_results.classList.add("hide");

    page.classList.remove("hide");

    // the voting and results pages are subpages of `round`. This
    // shim ensures that `round` is displayed when a subpage is shown.
    page.parentElement.classList.remove("hide");
}

window.setError = setError;