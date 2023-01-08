// Exports all of the routes that will be imported into web_server/WebServer.ts
import { Router } from "express";
import { resolve } from 'path';
import { PublicDirNames, getFileRouteInPublicDir } from "../assistive_functions/Routing";
import * as fs from 'fs';
export const router = Router();

// Sites index page. Loaded from web_server/WebServer.ts
router.get('/', (req, res) => {
    // Return the index.html file

    res.sendFile(resolve(getFileRouteInPublicDir('index.html', "html")));
    //res.end();
});

// Gets favicon
router.get('/favicon.ico', (req, res) => {
    res.sendFile(resolve("../public/favicon.ico"));
});

router.get('/cb', async (req, res) => {
    const code = req.query.code;

    if(code == "1") {
        // Bad code submitted
        return res.status(401).send(`<h1>Sorry! Your auth request failed.</h1><p>There isnt much we can help with other than suggest you try again...</p><br><a href="/">Home</a>`);
    }

    if(code == "2") {
        // Good code submitted

        // Get cookie
        const auth = req.cookies.Authorization;
        if(!auth) {
            return res.status(401).send(`<h1>Sorry! Your auth request failed.</h1><p>There isnt much we can help with other than suggest you try again...</p><br><a href="/">Home</a>`); // bad auth
        }

        // Read auth info
        const api_hash = await db.token.digestKey(auth);
        if(!api_hash) return res.status(401).send(`<h1>Sorry! Your auth request failed.</h1><p>There isnt much we can help with other than suggest you try again...</p><br><a href="/">Home</a>`); // bad auth
        const user_id = await db.token.getUserid(api_hash);
        if(!user_id) return res.status(401).send(`<h1>Sorry! Your auth request failed.</h1><p>There isnt much we can help with other than suggest you try again...</p><br><a href="/">Home</a>`); // bad auth
        const user = await db.users.get<UserInfo>(user_id);
        if(!user) return res.status(401).send(`<h1>Sorry! Your auth request failed.</h1><p>There isnt much we can help with other than suggest you try again...</p><br><a href="/">Home</a>`); // bad auth
        return res.status(200).send(`<h2>Auth succcess</h2><p>Logged in as ${user.user_id} (user_id)</p><a href='/'>Home</a>`);
    }

    return res.redirect('/');
})


// Primary routing service.
// Ignores the /api/ route
// Gets all information from fs
const ignore_routes = ['api', 'favicon.ico', 'cb'];
router.use(async (req, res, next) => {
    // Go to NEXT for all following paths
    const path_1 = req.path.split('/');
    path_1.shift();
    if(ignore_routes.includes(path_1[0].toLowerCase()) || req.path == "/") {
        next();
        return;
    }

    // If the file is /index or /index.html redirect to /
    if(req.path.toLowerCase() == "/index" || req.path.toLowerCase() == "/index.html") {
        // Redirect to /
        res.redirect(308, '/');
        return; // Exit the handler
    }

    let path = req.path;

    // If the path has no element of html, css or js add HTML and ensure file extension is valid
    // Check the file path has a type
    const has_type_in_path = () => {
        const has_html = req.path.startsWith('/html/');
        const has_js = req.path.startsWith('/js/');
        const has_css = req.path.startsWith('/css/');

        const is_html = req.path.endsWith('.html');
        const is_js = req.path.endsWith('.js');
        const is_css = req.path.endsWith('.css');

        return {t: has_html || has_css || has_js, e: is_html || is_css || is_js};
    }

    const has = has_type_in_path();

    if(!has.t) {
        // Add the html path
        path = `/html${req.path}`;
    }

    if(!has.e) {
        // Add the html file extension
        path = `${path}.html`;
    }

    // Check the file exists
    const exists = fs.existsSync(`../public/${path}`);
    if(!exists) {
        // 404
        return res.status(404).sendFile(resolve(getFileRouteInPublicDir('errors/404.html', 'html')));
    }

    const r = path.split('/');
    r.shift();
    const m = r.shift();
    const s = r.join('/');

    return res.sendFile(resolve(getFileRouteInPublicDir(s, m as PublicDirNames)));
})

// Load other routes.
import { api_router } from "./api";
import { UserInfo, db } from "../assistive_functions/TokenManager";
router.use('/api', api_router);