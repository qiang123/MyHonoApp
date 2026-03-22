import { RpcTarget } from 'capnweb'

import type { AuthContext } from './server/auth/clerk.js'

export interface PublicApi {
  hello(name: string): string
  whoAmI(): string
}

export class MyApiServer extends RpcTarget implements PublicApi {
  constructor(private readonly auth: AuthContext | null) {
    super()
  }

  hello(name: string) {
    return `Hello, ${name}!`
  }

  whoAmI() {
    return this.auth?.userId ?? 'anonymous'
  }
}
