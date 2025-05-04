'use server';

import { prisma } from '../prisma';
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Old path
import { authOptions } from '../authOptions'; // Import from new shared location
import { getServerSession } from 'next-auth/next';
import { CoreMessage } from 'ai';
import { revalidatePath } from 'next/cache'; // To update UI after mutations

// Type guard for CoreMessage array
function isCoreMessageArray(obj: unknown): obj is CoreMessage[] {
  return (
    Array.isArray(obj) &&
    obj.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'role' in item &&
        (item.role === 'user' ||
          item.role === 'assistant' ||
          item.role === 'system' ||
          item.role === 'function' ||
          item.role === 'tool') && // Updated roles based on CoreMessage
        'content' in item
      // Add other checks if necessary based on CoreMessage structure
    )
  );
}

// 1. Get User Chats (for sidebar history)
export async function getUserChats() {
  console.log("Attempting to get session in getUserChats..."); // Log attempt
  const session = await getServerSession(authOptions);
  console.log("Session object received in getUserChats:", JSON.stringify(session, null, 2)); // Log the session object

  if (!session?.user?.id) {
    console.error("Unauthorized access attempt or missing user ID in session."); // Log error condition
    throw new Error('Unauthorized: User not logged in.');
  }
  const userId = session.user.id;

  try {
    const chats = await prisma.chat.findMany({
      where: { userId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    return chats;
  } catch (error) {
    console.error("Error fetching user chats:", error);
    throw new Error("Failed to fetch chat history.");
  }
}

// 2. Get Messages for a Specific Chat
export async function getChatMessages(chatId: string): Promise<CoreMessage[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized: User not logged in.');
  }
  const userId = session.user.id;

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId }, // Ensure chat belongs to the user
      select: { messages: true },
    });

    if (!chat) {
      throw new Error("Chat not found or user unauthorized.");
    }

    // Validate the structure of the messages from JSON
    if (isCoreMessageArray(chat.messages)) {
      return chat.messages;
    } else {
      console.error("Invalid message structure in DB for chat:", chatId);
      // Return empty array or throw a more specific error
      return [];
    }
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId}:`, error);
    throw new Error("Failed to fetch chat messages.");
  }
}

// 3. Create a New Chat
export async function createChat(initialMessages: CoreMessage[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized: User not logged in.');
  }
  const userId = session.user.id;

  if (!isCoreMessageArray(initialMessages) || initialMessages.length === 0) {
    throw new Error("Invalid or empty initial messages provided.");
  }

  // Basic title generation (can be improved)
  const firstUserMessage = initialMessages.find(m => m.role === 'user');
  let title = "New Chat";
  if (firstUserMessage && typeof firstUserMessage.content === 'string') {
    title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
  }

  try {
    const newChat = await prisma.chat.create({
      data: {
        userId: userId,
        title: title,
        messages: initialMessages, // Prisma handles JSON serialization
      },
      select: { id: true, title: true, createdAt: true, updatedAt: true }, // Select necessary fields
    });

    revalidatePath('/'); // Revalidate the page to show the new chat in sidebar
    return newChat;
  } catch (error) {
    console.error("Error creating new chat:", error);
    throw new Error("Failed to create new chat.");
  }
}

// 4. Save/Update Chat Messages
export async function saveChatMessages(chatId: string, messages: CoreMessage[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized: User not logged in.');
  }
  const userId = session.user.id;

  if (!isCoreMessageArray(messages)) {
    throw new Error("Invalid messages format provided.");
  }

  try {
    // First, verify the chat belongs to the user
    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId },
      select: { id: true }, // Only need to check existence and ownership
    });

    if (!chat) {
      throw new Error("Chat not found or user unauthorized.");
    }

    // Update the messages
    const updatedChat = await prisma.chat.update({
      where: {
        id: chatId,
        // No need to check userId again here as we already verified ownership
      },
      data: {
        messages: messages, // Prisma handles JSON serialization
        // title could potentially be updated here too if desired
      },
      select: { id: true, updatedAt: true }, // Select fields to confirm update
    });

     revalidatePath('/'); // Revalidate the page to potentially update sidebar order
    return updatedChat;
  } catch (error) {
    console.error(`Error saving messages for chat ${chatId}:`, error);
    throw new Error("Failed to save chat messages.");
  }
} 