import * as bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from '../../../../lib/prisma'; // Import the singleton instance

const saltRounds = 10; // Cost factor for bcrypt hashing

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 }); // 409 Conflict
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        hashedPassword: hashedPassword,
        // Default level and xp are set in the schema
      },
    });

    // Return success response (don't return password hash)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: removedPassword, ...userWithoutPassword } = newUser;
    return NextResponse.json({ user: userWithoutPassword, message: "User created successfully" }, { status: 201 });

  } catch (error) {
    console.error("Signup API error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
} 