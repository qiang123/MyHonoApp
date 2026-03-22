import { RpcTarget } from "capnweb";
export class MyApiServer extends RpcTarget {
    hello(name) {
        return `Hello, ${name}!`;
    }
}
