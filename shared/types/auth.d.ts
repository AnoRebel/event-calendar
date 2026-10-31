// Augments nuxt-auth-utils' session with our user shape.
declare module "#auth-utils" {
  interface User {
    id: string
    email: string
    name?: string | null
  }
}

export {}
