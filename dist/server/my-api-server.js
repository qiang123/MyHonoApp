import { RpcTarget } from 'capnweb';
export class MyApiServer extends RpcTarget {
    auth;
    constructor(auth) {
        super();
        this.auth = auth;
    }
    hello(name) {
        return `Hello, ${name}!`;
    }
    whoAmI() {
        return this.auth?.userId ?? 'anonymous';
    }
}
