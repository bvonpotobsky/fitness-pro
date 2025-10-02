import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "~/server/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: true, // Allow role to be passed during signup
      },
    },
    async onCreate(user: any) {
      const role = user.role as string | undefined;
      const userId = user.id as string;

      // Create the appropriate profile based on role
      if (role === "coach") {
        await db.coach.create({
          data: {
            userId,
            bio: "",
            certifications: "",
          },
        });
      } else if (role === "client" || !role) {
        // Default to client if no role specified (for OAuth)
        // Check if client already exists (for OAuth re-auth)
        const existingClient = await db.client.findUnique({
          where: { userId },
        });

        if (!existingClient) {
          await db.client.create({
            data: {
              userId,
              notes: "",
            },
          });
        }
      }
    },
  },
});

// Helper function to get user role
export async function getUserRole(userId: string): Promise<"coach" | "client" | null> {
  const coach = await db.coach.findUnique({
    where: { userId },
  });

  if (coach) {
    return "coach";
  }

  const client = await db.client.findUnique({
    where: { userId },
  });

  if (client) {
    return "client";
  }

  return null;
}
