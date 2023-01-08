import {getCookie} from './modules/cookies.js';

const hello_tag = document.getElementById("hello_tag");
const username_tag = document.getElementById("username_tag");

// Function to load user data
function loadUserData() {
    // Read the Authorization cookie
    const auth = getCookie('Authorization');
    
    // Try to get /api/@me
    fetch('/api/@me')
        .catch()
        .then(response => response.json())
        .catch()
        .then(loadDataCallback);
}

function loadDataCallback(response) {
    username_tag.innerText = response.username;
}

loadUserData();