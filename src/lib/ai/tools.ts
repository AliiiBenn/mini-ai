import { tool } from 'ai';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { _recordWorkoutInDb, _getWorkoutsFromDb } from '@/lib/actions/dbActions';
import { type Workout, type Exercise, type WorkoutSet } from '@prisma/client';

// 1. Define the Zod schema for workout data
const workoutSchema = z.object({
    date: z.string().datetime({ offset: true }).optional().describe("Workout date in ISO 8601 format (e.g., YYYY-MM-DDTHH:mm:ssZ), defaults to today if omitted"),
    name: z.string().optional().describe("Optional name for the workout session, e.g., 'Leg Day'"),
    exercises: z.array(
        z.object({
            name: z.string().describe("Name of the exercise, e.g., 'Squat', 'Bench Press'"),
            sets: z.array(
                z.object({
                    setNumber: z.number().int().positive().optional().describe("Optional set number (1, 2, 3...)"),
                    repetitions: z.number().int().positive().optional().describe("Number of repetitions performed"),
                    weightKg: z.number().positive().optional().describe("Weight used in kilograms"),
                    // Add other relevant metrics here if needed in schema
                    // durationSeconds: z.number().int().positive().optional().describe("Duration of the set in seconds"),
                    // distanceKm: z.number().positive().optional().describe("Distance covered in kilometers"),
                })
            ).min(1).describe("At least one set must be recorded for an exercise")
        })
    ).min(1).describe("At least one exercise must be recorded for the workout")
});

// 2. Define the TypeScript type from the schema
export type WorkoutSchemaType = z.infer<typeof workoutSchema>;

// 3. Define the AI tool
export const recordWorkout = tool({
    description: "Records the details of a user's completed workout session, including the date (optional, defaults to execution time), an optional workout name, and a list of exercises. For each exercise, record its name and the details of each set performed (reps, weight in kg). Parse details from the user's natural language description.",
    parameters: workoutSchema,
    execute: async (workoutData: WorkoutSchemaType) => {
        console.log('recordWorkout tool called with:', workoutData);
        try {
            // Fetch session *inside* the execute function
            const session = await getServerSession(authOptions);
            if (!session || !session.user?.id) {
                // This should ideally not happen if the API route is protected,
                // but good to double-check.
                console.error('No session found in recordWorkout tool execute');
                return { error: "Authentication required.", success: false };
            }
            const userId = session.user.id;

            // Call the database function
            await _recordWorkoutInDb(userId, workoutData);

            // TODO: Add XP awarding call here if implementing gamification
            // await _addXp(userId, WORKOUT_XP_VALUE);

            // Return success message (can be customized)
            // Could potentially return the workout ID or a summary
            return { success: true, message: "Workout recorded successfully!" }; // Add XP message if gamification is added

        } catch (error) {
            console.error("Error executing recordWorkout tool:", error);
            // Return a structured error message for the AI/user
            let errorMessage = "Failed to record workout due to an internal error.";
            if (error instanceof Error) {
                errorMessage = `Failed to record workout: ${error.message}`;
            }
            return { error: errorMessage, success: false };
        }
    },
});

// Define other tools below (e.g., recordBodyWeight, recordRestDay)

// 4. Define the Zod schema for getWorkouts parameters
const getWorkoutsParamsSchema = z.object({
    limit: z.number().int().positive().optional().default(10).describe("Maximum number of recent workouts to retrieve (default: 10)"),
    // Potential future filters:
    // dateFrom: z.string().datetime({ offset: true }).optional().describe("Start date (ISO 8601)"),
    // dateTo: z.string().datetime({ offset: true }).optional().describe("End date (ISO 8601)"),
    // exerciseName: z.string().optional().describe("Filter by specific exercise name"),
});

// Type for the fetched workout data including relations
type WorkoutWithDetails = Workout & {
    exercises: (Exercise & {
        sets: WorkoutSet[];
    })[];
};

// 5. Define the getWorkouts AI tool
export const getWorkouts = tool({
    description: "Retrieves the raw data of the user's most recent workout sessions from their history (up to a specified limit). Use this when the user asks about their past workouts, workout log, or training history.",
    parameters: getWorkoutsParamsSchema,
    execute: async ({ limit }): Promise<WorkoutWithDetails[] | string> => {
        console.log(`getWorkouts tool called with limit: ${limit}`);
        try {
            const session = await getServerSession(authOptions);
            if (!session || !session.user?.id) {
                console.error('No session found in getWorkouts tool execute');
                // Return a user-facing error message string
                return "Sorry, I couldn't verify your identity to fetch workouts."; 
            }
            const userId = session.user.id;

            // Call the database function
            const workouts = await _getWorkoutsFromDb(userId, limit);

            // *** Return the raw workout data ***
            // The AI model will be responsible for summarizing this.
            return workouts as WorkoutWithDetails[]; 

        } catch (error) {
            console.error("Error executing getWorkouts tool:", error);
            const errorMessage = "Sorry, I encountered an error while trying to retrieve your workouts.";
            if (error instanceof Error) {
                 // You might want to log the specific error but return a generic message
                 console.error(`Specific error: ${error.message}`);
            }
             // Return a user-facing error message string
            return errorMessage; 
        }
    },
}); 