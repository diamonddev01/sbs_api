// Database
import {QuickDB} from 'quick.db';
import { createHash, randomBytes } from 'crypto';
import { makeRequest } from './MakeHttpsRequest';
import { Client_ID, Client_Secret, Redirect_Uri } from '../config/tokens.secret';
import { TokenTTL } from '../config/mainConfig';

export interface UserInfo {
    api_key: string; // User api key
    active: boolean; // Is the token active? (If false, the user needs to re-login)
    allowed_access: boolean; // Is the user allowed access, will block the users access to the website if false.
    token_expires: number; // The JS timestamp that the token expires, allowing REFRESH_TOKEN to occur after
    access_token: string; // The discord api token needed for this user
    refresh_token: string; // The discord api token that can be used to refresh for a new token
    user_id: string; // The users discord id
}

interface DiscordOAUTHToken {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string
}

export interface DiscordAPIUser {
    id: string;
    username: string;
    avatar: string;
    avatar_decoration: string | null;
    discriminator: string;
    public_flags: number;
    flags: number;
    banner: string;
    banner_color: string;
    accent_color: number;
    locale: string;
    mfa_enabled: boolean;
    premium_type: number;
}

interface token {
    hashed_api_key: string;
    expires_at: number;
    connected_user: string;
}

class TokenDB extends QuickDB {
    constructor() {
        super({
            table: "tokens",
            filePath: "../database/db.sqlite"
        });
    }

    // Take a token -> user id
    async getUserid(token: string): Promise<string | null> {
        const d = await this.get<token>(token);

        if(!d) return null;

        // Check the token is valid
        if(Date.now() > d?.expires_at) {
            // Delete expired token
            this.delete(token);
            return null; // expired returns null as the api treats this as an invalid key
        }

        return d.connected_user;
    }

    async digestKey(token: string): Promise<string> {
        return hashAPIKey(token);
    }

    async addNewToken(token: string, connected_user: string): Promise<token> {
        let v = await this.set<token>(token, {
            hashed_api_key: token,
            expires_at: Date.now() + TokenTTL,
            connected_user
        });

        return v;
    }
}

class UserDB extends QuickDB {
    constructor() {
        super({
            table: "users",
            filePath: "../database/db.sqlite"
        })
    }

    // user_id -> UserInfo
    async getUserData(user_id: string): Promise<UserInfo | null> {
        const d = await this.get<UserInfo>(user_id);
        return d;
    }

    async refresh(user_id: string): Promise<UserInfo | null> {
        // get current data
        const old_user = await this.getUserData(user_id);
        if(!old_user) return null;
        const {refresh_token} = old_user;

        // Reset oauth code
        const DiscordRes = await makeRequest<DiscordOAUTHToken>(`https://discord.com/api/v10/oauth2/token`, {
            form: {
                client_id: Client_ID,
                client_secret: Client_Secret,
                grant_type: "refresh_token",
                refresh_token
            }
        }, true);

        if(!DiscordRes) return null;
        const token = `Bearer ${DiscordRes.body.access_token}`;

        const discordUser = await makeRequest<DiscordAPIUser>(`https://discord.com/api/v10/users/@me`, {
            method: "GET",
            headers: {
                "Authorization": token
            }
        }, true);

        if(!discordUser || (discordUser.body as unknown as any).code) return null; // Bad token
        console.log(`[!] REFRESH: ${discordUser.body.username}#${discordUser.body.discriminator}`);

        const new_user = {...old_user};
        new_user.access_token = DiscordRes.body.access_token;
        new_user.refresh_token = DiscordRes.body.refresh_token;
        new_user.token_expires = Date.now() + DiscordRes.body.expires_in * 1000;

        return new_user;
    }

    async callback(oauth_token: string, reset?: boolean): Promise<{user: UserInfo, key: string} | null> {
        // Get the full OAUTH code

        const discordRes = await makeRequest<DiscordOAUTHToken>(`https://discord.com/api/v10/oauth2/token`, {
            form: {
                code: oauth_token,
                client_id: Client_ID,
                client_secret: Client_Secret,
                grant_type: "authorization_code",
                redirect_uri: Redirect_Uri
            },
            method: "POST"
        }, true);

        let data: DiscordAPIUser | DiscordOAUTHToken = discordRes.body;
        if(!data) return null; // Bad token

        const init_request = {...data};

        const acc = `Bearer ${data.access_token}`;

        // Check the user exists & get the user data
        const discordUser = await makeRequest<DiscordAPIUser>(`https://discord.com/api/v10/users/@me`, {
            method: "GET",
            headers: {
                "authorization": acc
            }
        }, true);

        data = discordUser.body;
        if(!data || (data as unknown as any).code) return null; // Bad token

        // Log
        console.log(`[!] Signin: ${data.username}#${data.discriminator}`);

        // generate token and user profile
        const api_key = await generateAPIKey();

        const user: UserInfo = {
            api_key: api_key.hashedApiKey,
            active: false,
            allowed_access: false,
            token_expires: Date.now() + init_request.expires_in * 1000,
            access_token: init_request.access_token,
            refresh_token: init_request.refresh_token,
            user_id: data.id
        }

        // Set this data
        this.set(data.id, user);
        db.token.addNewToken(api_key.hashedApiKey, data.id);

        return {user, key: api_key.apiKey};
    }
}

async function generateAPIKey(): Promise<{hashedApiKey: string, apiKey: string}> {
    const apiKey = randomBytes(32).toString('hex');
    const hashedApiKey = hashAPIKey(apiKey);

    if((await db.token.get(hashedApiKey) !== null)) {
        generateAPIKey();
    }

    return {hashedApiKey, apiKey};
}

function hashAPIKey(api_key: string) {
    const hashedAPIKey = createHash('md5').update(api_key).digest('hex');
    return hashedAPIKey;
}

class DB {
    token: TokenDB = new TokenDB();
    users: UserDB = new UserDB();
}

export const db = new DB();