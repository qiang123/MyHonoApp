import { newWebSocketRpcSession } from 'capnweb';
using stub = newWebSocketRpcSession('ws://localhost:8787/api');
console.log(await stub.hello("Cap'n Web"));
