import NextAuth from 'next-auth';
// import GitHubProvider from 'next-auth/providers/github';
// import EmailProvider from 'next-auth/providers/email';
// import CredentialsProvider from 'next-auth/providers/credentials'; // Enable Credentials provider
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import { prisma } from '../../../../lib/prisma'; // Import the singleton instance
// import bcrypt from 'bcrypt'; // Import bcrypt

// Import from the new location
import { authOptions } from '@/lib/authOptions'; 

// --- Environment Variable Checks ---
// Remove or adjust checks if only using CredentialsProvider
/*
if (!process.env.EMAIL_SERVER || !process.env.EMAIL_FROM) {
  console.warn("\x1b[33m%s\x1b[0m", "Warning: Email provider environment variables (EMAIL_SERVER, EMAIL_FROM) are not set.");
}
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  console.warn("\x1b[33m%s\x1b[0m", "Warning: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set.");
}
*/
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("\x1b[33m%s\x1b[0m", "Warning: NEXTAUTH_SECRET environment variable is not set.");
}
// --- End Environment Variable Checks ---

// Remove the entire authOptions definition from here
// export const authOptions: NextAuthOptions = { ... };

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 