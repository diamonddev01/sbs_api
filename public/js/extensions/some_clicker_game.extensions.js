const items = {
    "ac_basic": {
        auto: 1,
        click: 0
    },
    "ac_advanced": {
        auto: 5,
        click: 0
    },
    "cl_basic": {
        click: 1,
        auto: 0
    }
}

export function lookup(id) {
    return items[id];
}