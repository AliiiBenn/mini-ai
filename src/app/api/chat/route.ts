import { CoreMessage, streamText } from 'ai';
// import { createOpenAI } from '@ai-sdk/openai'; // Remove this
import { createOpenRouter } from '@openrouter/ai-sdk-provider'; // Add this
import { authOptions } from '@/lib/authOptions';
import { getServerSession } from 'next-auth/next';
import { recordWorkout, getWorkouts } from '@/lib/ai/tools'; // Import tools
// import { prisma } from '@/lib/prisma'; // Remove Prisma import
// import { z } from 'zod'; // Remove Zod import

export const maxDuration = 30;

// Remove ChatRequestSchema

// Create an OpenRouter client
const openrouter = createOpenRouter({ // Use createOpenRouter
  apiKey: process.env.OPENROUTER_API_KEY ?? "", // Use environment variable
  // No baseURL needed for the dedicated provider
});

// Remove console logs if desired

// No AIState/UIState needed for basic streaming

export async function POST(req: Request) {
  // Revert validation and chatId handling
  let messages: CoreMessage[];
  try {
      const body = await req.json();
      // Basic check for messages array (can be improved)
      if (!Array.isArray(body.messages)) {
          return new Response(JSON.stringify({ message: 'Invalid request body: messages array missing or not an array' }), { status: 400 });
      }
      messages = body.messages;
  } catch (error) {
      console.error("Error parsing JSON body:", error);
      return new Response(JSON.stringify({ message: 'Invalid JSON format' }), { status: 400 });
  }

  // --- Authentication Check --- (Keep)
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }
  // const userId = session.user.id; // Remove this line, userId is fetched in the tool
  // --- End Authentication Check ---

  // --- System Prompt --- 
  // Updated system prompt for clarity on handling tool results, especially getWorkouts data
  const systemPromptContent = `You are a helpful AI life agent. When you use a tool like 'getWorkouts' and receive data (like a list of workouts) as a tool result, generate a concise, natural language summary of that data for the user. For other tools that might return a simple message (like 'recordWorkout'), present that message clearly.`;
  const messagesWithSystemPrompt: CoreMessage[] = [
      ...(messages.length === 0 || messages[0].role !== 'system' ?
          [{ role: 'system', content: systemPromptContent } as CoreMessage] : []), // Add if no messages or first isn't system
      ...messages,
  ];
  // Update first message if it exists and isn't the right system prompt
  if (messages.length > 0 && messages[0].role === 'system' && messages[0].content !== systemPromptContent) {
      messagesWithSystemPrompt[0] = { role: 'system', content: systemPromptContent };
  }
  // --- End System Prompt ---

  try {
    // --- AI SDK Call with Tool --- 
    const result = streamText({
        model: openrouter.chat(process.env.OPENROUTER_MODEL || 'mistralai/mistral-small-3.1-24b-instruct:free'),
        messages: messagesWithSystemPrompt,
        tools: {
            recordWorkout, // Existing tool
            getWorkouts    // Add the new tool
            // Add other tools here as they are defined
            // recordBodyWeight,
            // recordRestDay,
            // ...
        },
        // Consider adding maxSteps if needed for multi-turn tool interactions
        // maxSteps: 5, 
        // Consider onFinish or onToolCall callbacks for client-side updates if using streamUI
    });
    // --- End AI SDK Call ---

    // Return the standard stream response *immediately*
    return result.toDataStreamResponse();

  } catch (error) {
    console.error("--- DETAILED ERROR in /api/chat --- ");
    console.error("Timestamp:", new Date().toISOString());
    console.error("Error Object:", error);
    // Log more details if available
    if (error instanceof Error) {
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        console.error("Error Stack:", error.stack);
    }
    // Consider logging request details (excluding sensitive info) if helpful
    // console.error("Request Messages (first 100 chars):", JSON.stringify(messages).substring(0, 100));
    console.error("--- END DETAILED ERROR --- ");

    // Return a generic error response
    // Avoid leaking detailed error info to the client in production
    return new Response(JSON.stringify({ message: 'Error processing chat request' }), { status: 500 });
  }
} 