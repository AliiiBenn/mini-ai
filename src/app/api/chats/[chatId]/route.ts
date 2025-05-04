import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
// import { Prisma } from '@prisma/client'; // Removed unused import

// Define schema ONLY for the chatId string itself
const ChatIdSchema = z.string().min(1);

// Define the context shape with params as a Promise
interface RouteContext {
  params: Promise<{ chatId: string }>;
}

// --- GET Handler --- 
export async function GET(
  req: Request,
  context: RouteContext // Use Promise type for params
) {
  let chatId: string | undefined = undefined;
  try {
    // Await the params promise
    const params = await context.params;
    chatId = params?.chatId; // Assign chatId after awaiting
    console.log("Raw context.params.chatId (GET - awaited):", chatId);

    // Validate the extracted string
    const validationResult = ChatIdSchema.safeParse(chatId);
    if (!validationResult.success) {
        console.error("ChatId validation failed (GET):", validationResult.error.errors);
        return NextResponse.json({ message: 'Invalid request parameters (chatId format)', details: validationResult.error.errors }, { status: 400 });
    }
    const validatedChatId = validationResult.data; // Use a different name to avoid shadowing
    console.log("GET /api/chats/[chatId] - Validated chatId:", validatedChatId);

    // Auth check (can be done after getting chatId if needed)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const chat = await prisma.chat.findUnique({
        where: { id: validatedChatId, userId: userId }, // Use validated ID
    });
    if (!chat) {
        return NextResponse.json({ message: 'Chat not found or unauthorized' }, { status: 404 });
    }
    return NextResponse.json(chat);

  } catch (error) {
    // Log chatId if it was resolved before the error
    console.error(`Error fetching chat ${chatId ?? '(chatId not resolved)'}:`, error); 
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// --- PUT Handler --- 

const UpdateChatSchema = z.object({
  messages: z.array(z.any()), 
  title: z.string().optional(),
});

export async function PUT(
  req: Request,
  context: RouteContext // Use Promise type for params
) {
  let chatId: string | undefined = undefined;
  try {
    // Await the params promise
    const params = await context.params;
    chatId = params?.chatId; // Assign chatId after awaiting
    console.log("Raw context.params.chatId (PUT - awaited):", chatId);

    // Validate the extracted string first
    const chatIdValidation = ChatIdSchema.safeParse(chatId);
    if (!chatIdValidation.success) {
      console.error("ChatId validation failed (PUT):", chatIdValidation.error.errors);
      return NextResponse.json({ message: 'Invalid request parameters (chatId format)', details: chatIdValidation.error.errors }, { status: 400 });
    }
    const validatedChatId = chatIdValidation.data; // Use validated ID
    console.log("PUT /api/chats/[chatId] - Validated chatId:", validatedChatId);

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Then parse the request body
    const body = await req.json();
    const { messages, title } = UpdateChatSchema.parse(body);

    // Use `any` for messages type in updateData
    const updateData: { messages: any; title?: string; updatedAt: Date } = {
        messages: messages as any, 
        updatedAt: new Date(),
    };
    if (title !== undefined) {
        updateData.title = title;
    }

    const updatedChat = await prisma.chat.update({
      where: { id: validatedChatId, userId: userId }, // Use validated ID
      data: updateData, 
    });

    return NextResponse.json(updatedChat);

  } catch (error) {
    // Log chatId if it was resolved before the error
    console.error(`Error updating chat ${chatId ?? '(chatId not resolved)'}:`, error);

    if (error instanceof z.ZodError) {
        console.error("Zod Validation Error on body in PUT /api/chats/[chatId]:", error.errors);
        return NextResponse.json({ message: 'Invalid request body', details: error.errors }, { status: 400 });
    }
    // Linter warning expected for the cast below
    if ((error as any)?.code === 'P2025') {
        console.warn(`PUT /api/chats/[chatId] - Chat not found for update: ${chatId ?? '(chatId not resolved)'}`); 
        return NextResponse.json({ message: 'Chat not found or unauthorized' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
