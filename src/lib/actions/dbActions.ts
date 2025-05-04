import { prisma } from '@/lib/prisma';
import { type WorkoutSchemaType } from '@/lib/ai/tools'; // Assuming type is defined here
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

/**
 * Records a workout session in the database, including nested exercises and sets.
 * @param userId The ID of the user recording the workout.
 * @param data The validated workout data matching WorkoutSchemaType.
 * @returns The created workout object or throws an error.
 */
export async function _recordWorkoutInDb(userId: string, data: WorkoutSchemaType) {
    console.log(`Recording workout for user ${userId} with data:`, JSON.stringify(data, null, 2));

    try {
        const workout = await prisma.workout.create({
            data: {
                userId: userId,
                date: data.date ? new Date(data.date) : new Date(), // Default to now if date is missing
                name: data.name, // Optional workout name
                exercises: {
                    create: data.exercises.map(exercise => ({
                        name: exercise.name,
                        sets: {
                            create: exercise.sets.map(set => ({
                                setNumber: set.setNumber, // Optional
                                repetitions: set.repetitions, // Optional
                                weightKg: set.weightKg, // Optional
                                // Add mappings for other potential metrics here
                            })),
                        },
                    })),
                },
            },
            // Include nested relations if needed for the return value
            include: {
                exercises: {
                    include: {
                        sets: true,
                    },
                },
            },
        });
        console.log("Workout successfully recorded:", workout.id);
        // TODO: Implement XP awarding logic here if needed
        // Example: await _addXp(userId, WORKOUT_XP_VALUE);
        return workout;
    } catch (error) {
        console.error("Error recording workout in DB:", error);
        // Consider more specific error handling or re-throwing
        throw new Error("Failed to save workout to the database.");
    }
}

// Placeholder for gamification - define XP constants and implement if needed
// const WORKOUT_XP_VALUE = 10;
// export async function _addXp(userId: string, amount: number) { ... }

// Add other database action functions below (e.g., _recordBodyWeightInDb)

/**
 * Retrieves recent workout sessions for a user from the database.
 * @param userId The ID of the user whose workouts to fetch.
 * @param limit The maximum number of workouts to retrieve (default: 10).
 * @returns An array of workout objects including exercises and sets, or throws an error.
 */
export async function _getWorkoutsFromDb(userId: string, limit: number = 10) {
    console.log(`Fetching last ${limit} workouts for user ${userId}`);
    try {
        const workouts = await prisma.workout.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                date: 'desc', // Get the most recent workouts first
            },
            take: limit, // Apply the limit
            include: {
                exercises: {
                    include: {
                        sets: true, // Include sets for each exercise
                    },
                },
            },
        });
        console.log(`Found ${workouts.length} workouts for user ${userId}.`);
        return workouts;
    } catch (error) {
        console.error("Error fetching workouts from DB:", error);
        throw new Error("Failed to retrieve workouts from the database.");
    }
} 