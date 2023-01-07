import express from 'express';
import * as path from 'path';
import { router } from '../routes/routing';

export const app = express(); // Create a webserver and then export it for use in index.ts

// Webserver configuration
export const port = 3000;

// Middleware similar to ROCKET framework on rust
app.use((_1, _2, next) => {
    next();
})

// Routing
// Spawn the main router
app.use('/', router);