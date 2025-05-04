'use client';

import { useState } from 'react';
import Link from 'next/link'; // To link back to login
import { signIn } from 'next-auth/react'; // Import signIn for potential auto-login
import { useRouter } from 'next/navigation'; // Import useRouter to redirect

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter(); // Initialize router
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Call the signup API route
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Signup successful
      setSuccess('Account created successfully! Redirecting to login...');

      // Optionally attempt to sign in immediately after signup
      // const signInResult = await signIn('credentials', {
      //   redirect: false,
      //   email,
      //   password
      // });
      // if (signInResult?.ok) {
      //   router.push('/'); // Redirect to home if sign-in is successful
      // } else {
      //   // If auto sign-in fails, redirect to login page
      //   console.error("Auto sign-in failed after signup:", signInResult?.error);
      //   router.push('/login');
      // }

      // --- Redirect to login page after a short delay ---
      setTimeout(() => {
        router.push('/login');
      }, 2000); // 2 second delay
      // --- End Redirect ---

    } catch (err: any) {
      console.error("Signup exception:", err);
      setError(err.message || 'An error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
          {/* Optionally add CardDescription here if needed */}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-600">{success}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing up...' : 'Sign up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Already have an account? {' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 