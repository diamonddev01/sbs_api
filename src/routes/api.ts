// Operates the /api route
// All subroutes are in /api/
import { Router } from "express";
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

api_router.get('/@me', async (req, res) => {
    // read auth info

    const return_bad = (c: 401 | 403): any => {
        console.log(c);
        if(c == 401) return res.status(401).send({code: 401, message: "Unauthorized", error: {token: 'missing'}});
        if(c == 403) return res.status(403).send({code: 403, message: "Forbidden", error: {auth: 'none'}});
    }

    const cookie = req.cookies.Authorization;
    if(!cookie) return return_bad(401);

    const api_hash = await db.token.digestKey(cookie);
    if(!api_hash) return return_bad(401);

    const user_id = await db.token.getUserid(api_hash);
    if(!user_id) return return_bad(401);

    const user = await db.users.get<UserInfo>(user_id);
    if(!user) return return_bad(403);

    // Get discord data
    const discord_data = await makeRequest<DiscordAPIUser>(`https://discord.com/api/v10/users/@me`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${user.access_token}`
        }
    }, true);

    return res.send(discord_data.body);
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