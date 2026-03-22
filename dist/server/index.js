import 'dotenv/config';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createNodeWebSocket } from '@hono/node-ws';
import { newRpcResponse } from '@hono/capnweb';
import { configureFromObject, expandEnvVars } from '@logtape/config';
import { getLogger } from '@logtape/logtape';
import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MyApiServer } from './my-api-server.js';
import { getAuth, optionalAuth, requireAuth, } from './server/auth/clerk.js';
const configPath = resolve(process.cwd(), 'src/logtape.json');
const config = JSON.parse(await readFile(configPath, 'utf-8'));
const expandedConfig = expandEnvVars(config);
await configureFromObject(expandedConfig);
const logger = getLogger(['myapp']);
const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
const apiPort = Number(process.env.API_PORT ?? '8787');
const authorizedParties = new Set([
    appUrl,
    ...(process.env.CLERK_AUTHORIZED_PARTIES ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
]);
app.use('*', cors({
    origin: (origin) => {
        if (!origin) {
            return appUrl;
        }
        return authorizedParties.has(origin) ? origin : '';
    },
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
}));
app.use('*', optionalAuth);
app.get('/health', (c) => {
    return c.json({ ok: true });
});
app.get('/me', requireAuth, (c) => {
    const auth = getAuth(c);
    if (!auth) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    return c.json({
        userId: auth.userId,
        sessionId: auth.sessionId,
    });
});
app.all('/api', (c) => {
    return newRpcResponse(c, new MyApiServer(getAuth(c)), {
        upgradeWebSocket,
    });
});
const webRoot = resolve(process.cwd(), 'dist/web');
if (existsSync(resolve(webRoot, 'index.html'))) {
    app.use('/assets/*', serveStatic({ root: webRoot }));
    app.use('/*.js', serveStatic({ root: webRoot }));
    app.use('/*.css', serveStatic({ root: webRoot }));
    app.use('/*.svg', serveStatic({ root: webRoot }));
    app.use('/*.png', serveStatic({ root: webRoot }));
    app.get('/', serveStatic({ root: webRoot, path: 'index.html' }));
    app.get('*', async (c, next) => {
        if (c.req.path === '/health' || c.req.path === '/me' || c.req.path === '/api') {
            return next();
        }
        return serveStatic({ root: webRoot, path: 'index.html' })(c, next);
    });
}
else {
    app.get('/', (c) => {
        return c.text('Frontend bundle not found. Run `npm run build` or `npm run dev:web`.');
    });
}
const server = serve({
    port: apiPort,
    fetch: app.fetch,
}, (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`);
});
injectWebSocket(server);
