import {lookup} from './extensions/some_clicker_game.extensions.js';

const coin_container = document.getElementById("coin_counter");
const clicker = document.getElementById("clicker_button");
const purchase_section = document.getElementById("purchase_items");
const KILL = document.getElementById("kill");
let last_coin_press = 0;

let per_second_auto = 0;
let per_click = 1;
let loaded = false;

KILL.onclick = (e) => {
    loaded = false;
}

let money = 0;

// load DOM and start automations
coin_container.innerText = "0 | LOADING FROM DB";
updateButtonText();
loadData();
setInterval(saveLoop, 2000);
setInterval(tick_money, 1000); // Loads the second by second interval

function saveLoop() {
    if(!loaded) return;
    save_balance();
}

function updateMoney() {
    coin_container.innerText = money;
}

clicker.onclick = (e) => {
    if(!loaded) return;
    // On click of the button
    // Check last coin press (rate-limit)
    let rateLimit /*ms*/ = 100; // 1 second

    if(Date.now() < (last_coin_press + rateLimit)) {
        // Bad press
        return;
    }

    last_coin_press = Date.now();
    money += per_click;
    updateMoney();
}

// Purchase buttons
for(const child of purchase_section.children) {
    // Create event listeners

    for(const __child of child.children) {
        /*
        i.onclick = (e) => {
        onPurchase(i, e);
        */

        if(__child.id == "purchase_item") {
            __child.onclick = (e) => {
                onPurchase(__child, e);
            }
        }
    }

    const eventListener = getChildByName("item_purchase", child);
    eventListener.onclick = (e) => {
        onPurchase(child, e);
    }
}

function getChildByName(child_name, DOM_Item) {
    for(const child of DOM_Item.children) {
        if(child.id == child_name) {
            return child;
        }
    }

    return null;
}

function onPurchase(DOM_Item, event_data) {
    // The DOM_Item is the div containing all of the information for the purchased item.
    const text_cost = getChildByName("item_cost", getChildByName("span_main", DOM_Item)).innerText;
    // remove the $ on cost
    const cost = new Number(text_cost.split("$")[1]);
    const item_id = getChildByName("item-id", DOM_Item).innerText;

    // Check the user has the correct amount of money
    if(cost > money) {
        // Not enough money. Flash element red.
        const pressButton = getChildByName("item_purchase", DOM_Item);
        pressButton.style["background-color"] = "red";
        setTimeout((element) => {
            element.style["background-color"] = "";
        }, 500, pressButton);
        return;
    }

    // Remove the correct amount of money from the user
    money -= cost;

    // Add the item purchased.
    const lookup_data = lookup(item_id);

    const auto = lookup_data.auto;
    const click = lookup_data.click
    per_second_auto += auto;
    per_click += click;

    updateButtonText();
    updateMoney();
    save_purchase(item_id);
}

function tick_money() {
    if(!loaded) return;
    // Get the per second money and add it to the current money
    money += per_second_auto;
    updateMoney();
}

function updateButtonText() {
    clicker.innerText = `Click Me (+${per_click}) | $${per_second_auto}/sec`;
}

function loadData() {
    // Fetch the api

    fetch('/api/@me/games/clicker')
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
    const OK = r.OK;

    if(!OK) {
        // reset stats
        loaded = true;
    } else {
        money = response.balance;

        // Read upgrades
        for(const item of response.upgrades) {
            const lookup_data = lookup(item);

            const auto = lookup_data.auto;
            const click = lookup_data.click
            per_second_auto += auto;
            per_click += click;

            updateButtonText();
            updateMoney();
        }

        loaded = true;
    }
}

function save_balance() {
    fetch('/api/@me/games/clicker/balance-' + money, {
        method: 'POST'
    }).catch();
}

function save_purchase(purchase) {
    fetch('/api/@me/games/clicker/purchase-' + purchase, {
        method: 'POST'
    }).catch();
}