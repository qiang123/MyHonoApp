import { newWebSocketRpcSession } from 'capnweb'
import type { PublicApi } from './my-api-server.js'

using stub = newWebSocketRpcSession<PublicApi>('ws://localhost:8787/api')

console.log(await stub.hello("Cap'n Web"))