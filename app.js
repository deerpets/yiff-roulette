// Import the functions you need from the SDKs you need
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore()
db.collection("rooms").doc("abcde").get().then((snap) => { console.log(snap.data()) })

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