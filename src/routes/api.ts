// Operates the /api route
// All subroutes are in /api/
import { Router } from "express";
import { app } from "../web_server/WebServer";
export const api_router = Router();

// API middleare
// AUTH
api_router.use((req, res, next) => {
    // Ensure that the req is authed
    const auth = true; // REMOVE THIS LINE AND REPLACE IT WITH AUTH FUNCTION

    if(!auth) {
        // Return a bad auth error
        res.status(403).send(JSON.stringify({code: 403, message: "Forbidden", error: {auth}}));
        res.end();
        return;
    }

    next();
})

// Main paths

// Routed paths
