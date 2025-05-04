import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { type CoreMessage } from 'ai';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const chats = await prisma.chat.findMany({
      where: {
        userId: userId,
      },
      select: { // Select only necessary fields for the list
        id: true,
        title: true,
        updatedAt: true,
        // Optionally select a snippet of the last message if needed for preview
        // messages: { take: -1 } // This syntax isn't directly supported for JSON
      },
      orderBy: {
        updatedAt: 'desc', // Show most recent chats first
      },
    });

    // If you want to add a preview snippet, you'd need to fetch `messages`
    // and process it here, potentially truncating the content.
    // Example (pseudo-code, adapt CoreMessage type):
    /*
    const chatsWithPreview = chats.map(chat => {
      const lastMessage = chat.messages?.[chat.messages.length - 1];
      return {
        ...chat,
        preview: lastMessage?.content?.substring(0, 50) ?? 'No messages yet',
      };
    });
    */

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching chat list:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Zod schema for POST request body
const CreateChatSchema = z.object({
  messages: z.array(z.any()), // Use z.any() for CoreMessage for now
  title: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { messages, title: providedTitle } = CreateChatSchema.parse(body);

    if (!messages || messages.length === 0) {
        return NextResponse.json({ message: 'Messages array cannot be empty' }, { status: 400 });
    }

    // Generate title if not provided (e.g., from first user message)
    const title = providedTitle || messages.find(m => m.role === 'user')?.content?.substring(0, 50) || 'New Chat';

    const newChat = await prisma.chat.create({
      data: {
        userId: userId,
        title: title,
        messages: messages as any, // Cast as any for Prisma JSON
      },
    });

    return NextResponse.json(newChat, { status: 201 }); // Return created chat with 201 status

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid request body', details: error.errors }, { status: 400 });
    }
    console.error('Error creating chat:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 