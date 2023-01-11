// Operates the /api route
// All subroutes are in /api/
import { Request, Response, Router } from "express";
import { db, DiscordAPIUser, UserInfo } from "../assistive_functions/TokenManager";
import * as cookie_parser from 'cookie-parser';
import { makeRequest } from "../assistive_functions/MakeHttpsRequest";
export const api_router = Router();

api_router.use(cookie_parser.default()); // Use cookie parser in code

// API middleare
// AUTH
api_router.use((req, res, next) => {
    // Ensure that the req is authed
    const auth = true; // REMOVE THIS LINE AND REPLACE IT WITH AUTH FUNCTION

    if(!auth) {
        if(req.path == "/callback") return next(); // This is the path of getting an auth token for the api, dont auto-ban it
        // Return a bad auth error
        res.status(403).send(JSON.stringify({code: 403, message: "Forbidden", error: {auth}}));
        res.end();
        return;
    }

    next();
})
// Main paths
api_router.get('/callback', async (req, res) => {
    const code = req.query.code as string;
    if(!code) return res.redirect('/');

    // Code is valid
    const userinfo = await db.users.callback(code, false);
    if(!userinfo) {
        // bad code
        return res.redirect('/cb?code=1');
    }

    // SET COOKIES
    res.cookie('Authorization', userinfo.key);
    return res.redirect('/cb?code=2');
});

async function readAuthInfo(req: Request, res: Response): Promise<UserInfo | void> {
    const return_bad = (c: 401 | 403): any => {
        if(c == 401) return res.status(401).send({code: 401, message: "Unauthorized", error: {token: 'missing'}});
        if(c == 403) return res.status(403).send({code: 403, message: "Forbidden", error: {auth: 'none'}});
    }

    const cookie = req.cookies.Authorization;
    if(!cookie) return return_bad(401);

    const api_hash = await db.token.digestKey(cookie);
    if(!api_hash) return return_bad(401);

    const user_id = await db.token.getUserid(api_hash);
    if(!user_id) return return_bad(401);

    const user = await db.users.getUserData(user_id);
    if(!user) return return_bad(403);
    
    return user;
}

api_router.get('/@me', async (req, res) => {
    // read auth info
    const user = await readAuthInfo(req, res);
    if(!user) return;
    // Get discord data
    const discord_data = await makeRequest<DiscordAPIUser>(`https://discord.com/api/v10/users/@me`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${user.access_token}`
        }
    }, true);

    if(discord_data && (discord_data as unknown as any).code) {
        // Invalid discord oauth
        // re-auth needed
        db.users.refresh(user.user_id);
        res.redirect('./@me');
    }

    return res.send(discord_data.body);
})

api_router.get('/@me/games/:game_name', async (req, res) => {
    const game = req.params.game_name;

    const user = await readAuthInfo(req, res);
    if(!user) return;

    // Get game data from user obj
    const user_games = user.games;
    if(!user_games) return res.status(500).send({failed: true, error: 500, text: "Internal Server Error"});
    if(!user_games.hasOwnProperty(game)) return res.status(500).send({failed: true, error: 500, text: "Internal Server Error"});
    const user_game_x = user_games[game];

    return res.send(user_game_x);
})

api_router.post('/@me/games/:game_name/:action_name', async (req, res) => {
    const game = req.params.game_name;
    const action = req.params.action_name;
    const user = await readAuthInfo(req, res);

    if(!user) return;

    const user_games = user.games;
    if(!user_games) return res.status(500).send({failed: true, error: 500, text: "Internal Server Error"});
    if(!user_games.hasOwnProperty(game)) return res.status(500).send({failed: true, error: 500, text: "Internal Server Error"});
    const user_game_x = user_games[game];

    // Get the action
    // action format
    // (ACTION)-(ACTION_META)
    // eg. purchase-ac_basic
    // eg. balance-500

    let final_code = 400;

    const data = action.split('-');
    switch(data[0]) {
        case "purchase":
            if(!data[1]) {
                break; // final code 400
            }

            user.games.clicker.upgrades.push(data[1]);
            final_code = 200;
            break;
        case "balance": {
            if(!data[1]) {
                break; // final code 400
            }

            final_code = 200;
            user.games.clicker.balance = new Number(data[1]).valueOf();
            break;
        }
    }

    await db.users.set<UserInfo>(user.user_id, user);

    return res.sendStatus(final_code);
})

// Routed paths
// api_router.use('/*', (req, res) => {
//     res.status(404).send({
//         code: 404,
//         message: "Not Found",
//         error: {
//             exists: false
//         }
//     })
// })