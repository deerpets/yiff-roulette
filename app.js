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
const room_code_alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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

window.createRoom = createRoom;
window.generateRoomCode = generateRoomCode;
// const app = firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore()
// db.collection("rooms").doc("abcde").get().then((snap) => { console.log(snap.data()) })

let entries = [];
let currentEntry = -1;

function addEntry() {
    let name = document.getElementById('name').value;
    let url = document.getElementById('url').value;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    if (name && url) {
        entries.push({ name, url });
        document.getElementById('name').value = '';
        document.getElementById('url').value = '';
    }
}

function startGame() {
    if (entries.length === 0) {
        alert('Please add at least one entry.');
        return;
    }

    document.getElementById('inputForm').style.display = 'none';
    document.getElementById('results').style.display = 'block';
    shuffle(entries);
    showNextEntry();
}

function showNextEntry() {
    if (currentEntry + 1 < entries.length) {
        currentEntry += 1;
        document.getElementById('displayName').textContent = '?';
        document.getElementById('nextbtn').disabled = true;
    } else {
        alert('Game Over!');
    }
}

function openLink() {
    window.open(entries[currentEntry].url, '_blank');
}

function revealName() {
    document.getElementById('displayName').textContent = entries[currentEntry].name;
    document.getElementById('nextbtn').disabled = false;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/*  fetch('https://e621.net/posts/4394630.json')
.then(response => response.json())
.then(data => {
  // Process and display the data in your app
  console.log(data);
})
.catch(error => {
  // Handle any errors
  console.error('Error fetching data: ', error);
}); */