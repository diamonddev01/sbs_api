const items = {
    "ac_basic": {
        auto: 1,
        click: 0
    },
    "ac_advanced": {
        auto: 5,
        click: 0
    },
    "ac_epic": {
        auto: 15,
        click: 0
    },
    "ac_ultra": {
        auto: 50,
        click: 0
    },
    "ac_legendary": {
        auto: 100,
        click: 1
    },
    "cl_basic": {
        click: 1,
        auto: 0
    },
    "cl_advanced": {
        click: 10,
        auto: 0
    },
    "cl_epic": {
        click: 100,
        auto: 0
    },
    "cl_legendary": {
        click: 1000,
        auto: 10
    }
}

export function lookup(id) {
    return items[id];
}