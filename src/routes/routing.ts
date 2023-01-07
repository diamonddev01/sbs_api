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
})


// Primary routing service.
// Ignores the /api/ route
// Gets all information from fs
router.use(async (req, res, next) => {
    // Go to NEXT for all following paths
    if(req.path.startsWith('/api') || req.path == '/' || req.path.toLowerCase() == "/favicon.ico") {
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
router.use('/api', api_router);