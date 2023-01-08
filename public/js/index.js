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
        .then(async response => {
            let v = {
                response: await response.json(),
                OK: false
            }
            if(response.status == 200 || response.status == 304) {
                v.OK = true;
                return v;
            }

            v.OK = false;
            return v;
        })
        .catch()
        .then(loadDataCallback);
}

function loadDataCallback(r) {
    const response = r.response;
    console.log(r);
    if(!r.OK) {
        username_tag.innerHTML = "Your not logged in. <a href='https://discord.com/oauth2/authorize?client_id=1058863844576985148&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fcallback&response_type=code&scope=identify'>Login?</a>"
    } else {
        username_tag.innerText = response.username;
    }
}

loadUserData();