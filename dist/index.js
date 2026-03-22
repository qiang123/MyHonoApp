import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { newRpcResponse } from '@hono/capnweb';
import { MyApiServer } from './my-api-server.js';
import { getLogger } from "@logtape/logtape";
import { configureFromObject, expandEnvVars } from '@logtape/config';
import { readFile } from "node:fs/promises";
const configPath = new URL("../src/logtape.json", import.meta.url);
const config = JSON.parse(await readFile(configPath, "utf-8"));
const expanded = expandEnvVars(config);
await configureFromObject(expanded);
// const isDevelopment = process.env.NODE_ENV === "development";
// await configure({
//   sinks: {
//     console: getConsoleSink(),
//     file: getFileSink(isDevelopment ? "dev.log" : "prod.log"),
//   },
//   loggers: [
//     {
//       category: "my-app",
//       lowestLevel: isDevelopment ? "trace" : "info",
//       sinks: isDevelopment ? ["console", "file"] : ["file"],
//     },
//   ],
// });
const logger = getLogger(['myapp']);
logger.info({
    userId: 123456,
    username: "johndoe",
    loginTime: new Date(),
});
const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
app.get('/', (c) => {
    return c.text('Hello Hono!');
});
app.all('/api', (c) => {
    return newRpcResponse(c, new MyApiServer(), {
        upgradeWebSocket,
    });
});
const server = serve({
    port: 8787,
    fetch: app.fetch,
}, (info) => {
    // console.log(`Server is running on http://localhost:${info.port}`)
    logger.debug(`\nServer is running on http://localhost:${info.port}\n`);
});
injectWebSocket(server);
