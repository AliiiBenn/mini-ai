// import NextAuth, { DefaultSession, DefaultUser } from "next-auth" // Removed unused imports
import { DefaultSession } from "next-auth"
// import { JWT, DefaultJWT } from "next-auth/jwt" // Removed unused imports
import { DefaultJWT } from "next-auth/jwt"

// Extend the built-in session/user types to include the 'id' property

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getServerSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    user: {
      id: string; // Add the id field
    } & DefaultSession["user"]
  }

  // If you need to add properties to the User object itself (e.g., from authorize callback)
  // You might need DefaultUser if you uncomment this
  // import { DefaultUser } from "next-auth"
  // interface User extends DefaultUser {
  //   id: string;
  // }
}

// Extend the built-in JWT type
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    /** OpenID ID Token */
    id?: string; // Add the id field to the token itself if needed, often populated from sub
    // You might need JWT if you uncomment lines above
    // import { JWT } from "next-auth/jwt"
  }
} 