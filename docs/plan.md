# Development Plan: AI Life Agent

## 1. Core Objective

To build a conversational AI application (like ChatGPT) acting as a "life agent". The agent will have persistent memory of the user (profile, goals) and their interactions, stored securely in a PostgreSQL database with user authentication. Initial key features include detailed tracking of workouts (exercises, sets, reps, weight), **rest days**, body weight logging, fitness goal management, and the ability to retrieve this data and display dynamically generated graphs within the chat interface. **A gamification system with levels and experience points (XP) will reward user engagement.** All code implementation will be in English.

## 2. Key Technologies

*   **Framework:** Next.js (App Router)
*   **AI SDK:** Vercel AI SDK (`ai`, `@ai-sdk/react`)
*   **LLM Provider:** **OpenRouter** (`@ai-sdk/openrouter`) - Allows access to various models.
*   **UI:** React, Tailwind CSS (or similar component library like Shadcn/UI)
*   **Charting:** Recharts
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** Better Auth (`better-auth`, `better-auth/react`, `@better-auth/cli`)
*   **Schema Validation:** Zod
*   **Language:** TypeScript (Codebase in English)

## 3. Development Phases

### Phase 1: Foundation, Auth (Better Auth) & DB Schema

1.  **Project Setup:**
    *   Initialize Next.js project (App Router, TypeScript).
    *   Configure ESLint, Prettier.
    *   Install dependencies: `ai`, `@ai-sdk/react`, **`@ai-sdk/openrouter`**, `zod`, `prisma`, `@prisma/client`, `better-auth`, `better-auth/react`, `@better-auth/cli` (dev), `pg`, `recharts`, `react-resize-detector`.
    *   Set up environment variables (`.env`): **`OPENROUTER_API_KEY`**, `DATABASE_URL`, `BETTER_AUTH_SECRET`. Add provider secrets if using social login.
2.  **Prisma Schema Definition (`schema.prisma`):**
    *   Define initial models for application data:
        *   `User`: Basic fields (name/email), add **`level` (Int, default 1)**, **`xp` (Int, default 0)**.
        *   `Workout`, `Exercise`, `WorkoutSet`, `BodyWeightLog`, `FitnessGoal` (as previously defined).
        *   **`RestDayLog`**: `id`, `userId` (relation to `User`), `date` (DateTime).
    *   Authentication-specific models (`Session`, etc.) will be handled/added by Better Auth CLI.
3.  **Better Auth Server Configuration (`src/lib/auth-server.ts`):**
    *   Create and configure the main `auth` instance using `betterAuth`.
    *   Configure `database` option with a `pg` `Pool` instance using `DATABASE_URL`.
    *   Enable desired authentication methods (`emailAndPassword`, `socialProviders`).
    *   Configure the `secret` reading from `BETTER_AUTH_SECRET`.
4.  **Better Auth Schema Generation:**
    *   Run `npx @better-auth/cli@latest generate`.
    *   Verify `schema.prisma` is updated correctly with necessary User fields and Session/related models by the CLI. Adjust if necessary.
5.  **Database Migration:**
    *   Generate Prisma client (`npx prisma generate`) after schema modification.
    *   Create and apply the database migration (`npx prisma migrate dev`).
6.  **Better Auth API Route (`src/app/api/auth/[...betterauth]/route.ts`):**
    *   Create the catch-all API route.
    *   Import the configured server `auth` instance.
    *   Export `const { GET, POST } = auth.handler;`.
7.  **Better Auth Client Configuration (`src/lib/auth-client.ts`):**
    *   Create and export the `authClient` using `createAuthClient` from `better-auth/react`.
8.  **Client-Side Auth Setup:**
    *   Integrate necessary Better Auth context provider (if required by `better-auth/react`).
    *   Implement Login, Sign Up, Logout UI components using `authClient` methods (`signIn.email`, `signUp.email`, `signOut`).
    *   Use `authClient.useSession()` hook to display user state and protect UI elements.
9.  **Testing:** Thoroughly test sign-up, sign-in, sign-out flows. Verify data population in PostgreSQL tables (`User`, `Session`, etc.).

### Phase 2: Basic Chat & User Context

1.  **Chat UI Component (`src/components/ChatInterface.tsx`):**
    *   Create the main chat component.
    *   Use Vercel AI SDK's `useChat` hook for message handling, input state.
    *   Render message list (user and AI).
    *   Include input field and submit button.
    *   Ensure component is only accessible/functional for authenticated users (check `authClient.useSession()`).
2.  **Chat API Route (`src/app/api/chat/route.ts`):**
    *   Create the API route.
    *   **Secure the route:** Use Better Auth server methods (`auth.api.getSession({ headers })` or middleware) to verify authentication and retrieve `userId`. Reject unauthenticated requests.
    *   **Use `streamUI` with OpenRouter:** Initialize Vercel AI SDK with `streamUI` and the `openrouter` provider (e.g., `openrouter('anthropic/claude-3-haiku-20240307')`). Make the model name configurable if desired.
    *   Pass current message history to the LLM.
    *   Inject basic user context (e.g., "You are talking to user ID: {userId}") into the system prompt.
    *   Define an empty `tools: {}` object initially.
3.  **Testing:** Verify that logged-in users can have basic back-and-forth conversations with the AI using the configured OpenRouter model.

### Phase 3: Recording Data (Workouts, Weight, Goals, Rest Days) & Gamification Logic

1.  **Define AI Tools (within `streamText` or `streamUI` `tools` object in `/api/chat`):**
    *   **`recordWorkout` tool:**
        *   **Implementation:** Use the `tool()` helper from the `ai` SDK.
        *   **Schema (Zod):** Define a detailed, nested schema using `zod`. Example:
            ```typescript
            z.object({
              date: z.string().datetime().optional().describe("Workout date in ISO 8601 format, defaults to today if omitted"),
              name: z.string().optional().describe("Optional name for the workout session, e.g., 'Leg Day'"),
              exercises: z.array(
                z.object({
                  name: z.string().describe("Name of the exercise, e.g., 'Squat', 'Bench Press'"),
                  sets: z.array(
                    z.object({
                      setNumber: z.number().int().positive().optional().describe("Optional set number (1, 2, 3...)"),
                      repetitions: z.number().int().positive().optional().describe("Number of repetitions performed"),
                      weightKg: z.number().positive().optional().describe("Weight used in kilograms"),
                      // Add other relevant metrics like durationSeconds, distanceKm if needed
                    })
                  ).min(1).describe("At least one set must be recorded for an exercise")
                })
              ).min(1).describe("At least one exercise must be recorded for the workout")
            })
            ```
        *   **Description:** Provide clear LLM instructions: "Records the details of a user's completed workout session, including the date (optional, defaults to today), an optional workout name, and a list of exercises. For each exercise, record its name and the details of each set performed (reps, weight in kg). Parse details from the user's natural language description."
        *   **`execute` function (async):**
            *   Receives validated `workoutData` matching the Zod schema.
            *   **Get `userId`:** Retrieve the authenticated user's ID from the session (e.g., using NextAuth's `getServerSession`). *Ensure the API route handler fetches the session.*
            *   Yield a loading state if using `streamUI` (e.g., `<p>Recording workout...</p>`).
            *   Call an internal `async function _recordWorkoutInDb(userId: string, workoutData: WorkoutSchemaType)` using Prisma.
            *   **Award XP:** Call `await _addXp(userId, WORKOUT_XP_VALUE)` (e.g., 10 XP). Define `_addXp` and `WORKOUT_XP_VALUE` as per original plan.
            *   Return a confirmation message/component including XP gain (e.g., `"OK, workout recorded! +10 XP"` or `<p>OK, workout recorded! +10 XP</p>`).
    *   **`recordBodyWeight` tool:**
        *   Schema (Zod): `{ weightKg: number, date?: string }`.
        *   Description: "Use when the user states their body weight."
        *   `generate` function: Yield loading, call `_recordBodyWeightInDb(userId, weightData)`, **call `await _addXp(userId, WEIGHT_XP_VALUE)`** (e.g., 5 XP), return confirmation with XP.
    *   **`recordFitnessGoal` tool:**
        *   Schema (Zod): `{ description: string, targetDate?: string }`.
        *   Description: "Use when the user sets a new fitness goal."
        *   `generate` function: Yield loading, call `_recordGoalInDb(userId, goalData)`, **call `await _addXp(userId, GOAL_XP_VALUE)`** (e.g., 5 XP), return confirmation with XP.
    *   **`recordRestDay` tool:**
        *   Schema (Zod): `{ date?: string }`. Default to today if not provided.
        *   Description: "Use when the user indicates they took a rest day."
        *   `generate` function: Yield loading, call `_recordRestDayInDb(userId, date)`, **call `await _addXp(userId, REST_XP_VALUE)`** (e.g., 2 XP), return confirmation with XP.
2.  **Implement Database & Gamification Logic:**
    *   **Create/Update DB Actions (`src/lib/actions/dbActions.ts` or similar):**
        *   Implement `async function _recordWorkoutInDb(userId: string, data: WorkoutSchemaType)`:
            *   Use `prisma.workout.create()` with nested `create` for `exercises` and `workoutSets`.
            *   Handle `date` (defaulting to `new Date()` if not provided).
            *   Connect the workout to the `userId`.
        *   Implement `_recordBodyWeightInDb`, `_recordGoalInDb`, `_recordRestDayInDb` similarly.
    *   **Create `_addXp(userId, amount)` function:** As described previously (fetch user, update XP/level, save).
    *   **Define XP Constants:** Set constant values (e.g., `WORKOUT_XP_VALUE = 10`).
3.  **Update API Route (`src/app/api/chat/route.ts`):**
    *   Import the defined tools (e.g., `recordWorkout`).
    *   Fetch the user session within the `POST` handler to get `userId`. Handle unauthenticated users.
    *   Pass the `tools` object to the `streamText` or `streamUI` call: `tools: { recordWorkout, recordBodyWeight, ... }`.
4.  **Testing:** Engage in conversation to trigger the `recordWorkout` tool (e.g., "I did 3 sets of 10 reps bench press at 80kg today"). Verify:
    *   Correct data parsing and population in `Workout`, `Exercise`, `WorkoutSet` tables in the database.
    *   Correct XP calculation and update in the `User` table.
    *   Accurate confirmation message returned in the chat.

### Phase 4: Retrieving Data & Generating Graphs

1.  **Define Data Retrieval AI Tools (within `streamUI` `tools` object):**
    *   **`getWorkouts` tool:**
        *   Schema (Zod): Filters like `{ dateRange?: { from: string, to: string }, exerciseName?: string, limit?: number }`.
        *   Description: "Use when the user asks about their workout history."
        *   `generate` function: Yield loading, call `_getWorkoutsFromDb(userId, filters)`, format results, return a component displaying the history (e.g., `<WorkoutHistory data={workouts} />`).
    *   **`getFitnessGoals` tool:**
        *   Schema (Zod): Filters like `{ status?: "active" | "achieved" | "abandoned" }`.
        *   Description: "Use when the user asks about their fitness goals."
        *   `generate` function: Yield loading, call `_getGoalsFromDb(userId, filters)`, return component (e.g., `<GoalList goals={goals} />`).
    *   **`generateWorkoutGraph` tool:**
        *   Schema (Zod): Parameters like `{ exerciseName: string, metric: "weightKg" | "repetitions" | "durationSeconds" | "distanceKm", timeRange?: { from: string, to: string } }`.
        *   Description: "Use when the user asks to visualize progress for a specific exercise metric over time (e.g., 'graph my squat weight')."
        *   `generate` function (async generator):
            *   `yield` loading component.
            *   Call `_getWorkoutDataForGraph(userId, params)` using Prisma to fetch relevant data (e.g., `WorkoutSet` joined with `Workout` for dates).
            *   Process data into format suitable for Recharts (e.g., `[{ date: 'YYYY-MM-DD', value: number }]`).
            *   **Return the React Chart component:** `<WorkoutProgressChart data={processedData} exerciseName={params.exerciseName} metric={params.metric} />`.
    *   **`getUserStats` tool:**
        *   Schema (Zod): Empty object `{}` (no parameters needed).
        *   Description: "Use when the user asks about their level, XP, or game stats."
        *   `generate` function: Yield loading, fetch user's `level` and `xp` using Prisma (`_getUserStatsFromDb(userId)`), return a component displaying the stats (e.g., `<UserStats level={level} xp={xp} />`).
2.  **Implement Database Retrieval Logic:**
    *   Create/Update internal async helper functions: `_getWorkoutsFromDb`, `_getGoalsFromDb`, `_getWorkoutDataForGraph`, **`_getUserStatsFromDb`**. Modify `_getWorkoutsFromDb` if combining with rest days.
3.  **Create React Display Components:**
    *   `WorkoutProgressChart.tsx`, `WorkoutHistory.tsx`, `GoalList.tsx`.
    *   **`UserStats.tsx`**: Simple component to display level and XP.
4.  **Testing:** Initiate conversations to retrieve data, including user stats ("What's my level?", "How much XP do I have?"). Verify correct data retrieval and rendering of summaries, graphs, and stats components.

### Phase 5: Refinement, Long-Term Memory & Deployment

1.  **Memory & Gamification Enhancement:**
    *   Explore strategies for better long-term context.
    *   Implement goal status updates (tool `updateFitnessGoalStatus`) and **award XP upon goal achievement**.
    *   Refine XP values and level-up mechanics based on testing/feedback.
2.  **UI/UX Polish:**
    *   Refine chat interface styling, loading indicators, error handling messages.
    *   Improve appearance and interactivity of graphs.
3.  **Optimization:**
    *   Review and optimize LLM prompts for clarity and efficiency.
    *   Analyze and optimize database query performance.
4.  **Deployment:**
    *   Configure for production environment.
    *   Deploy the application (e.g., to Vercel).
