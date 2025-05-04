import { type NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from './prisma'; // Adjusted import path for prisma
import bcrypt from 'bcrypt';

// Add necessary imports that might have been outside the previous selection
// For example, if User type was imported from elsewhere

// --- Environment Variable Checks (Optional but recommended) ---
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("\x1b[33m%s\x1b[0m", "Warning: NEXTAUTH_SECRET environment variable is not set.");
}
// --- End Environment Variable Checks ---

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, _req): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          console.log('No user found with this email');
          return null; 
        }

        if (!user.hashedPassword) {
          console.log('User does not have a password set');
          return null; 
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isValidPassword) {
          console.log('Invalid password');
          return null; 
        }

        console.log('Credentials valid for user:', user.email);
        // Prisma User object might have extra fields not expected by NextAuth User type directly
        // Return necessary fields or ensure types are compatible
        // A safe approach is to return only what NextAuth needs if types diverge
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            // Do NOT return hashedPassword here!
        };
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev",
  session: {
    strategy: "jwt", 
  },
  callbacks: {
    // Ensure session callback receives the correct user object structure
    async session({ session, token }) {
      if (token && session.user) {
        // Add the user ID from the token (subject) to the session user object
        // Use a type assertion or extend the Session type if TypeScript complains
        (session.user as any).id = token.sub;
      }
      return session;
    },
    // Ensure JWT callback gets user ID correctly on sign-in
    async jwt({ token, user }) {
      if (user) {
        // The user object here comes from the authorize function or provider
        token.sub = user.id; // 'sub' is standard JWT field for subject (user ID)
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  }
}; 