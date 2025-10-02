import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const clientsRouter = createTRPCRouter({
  listForCoach: protectedProcedure.query(async ({ ctx }) => {
    // Get the coach profile for the authenticated user
    const coach = await ctx.db.coach.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!coach) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only coaches can list clients",
      });
    }

    // Get all clients for this coach with their user data and plan count
    const clients = await ctx.db.client.findMany({
      where: { coachId: coach.userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            plans: {
              where: {
                coachId: coach.userId, // Only count plans created by this coach
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return clients;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get the coach profile for the authenticated user
      const coach = await ctx.db.coach.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!coach) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can access client details",
        });
      }

      const client = await ctx.db.client.findUnique({
        where: { userId: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          _count: {
            select: {
              plans: {
                where: {
                  coachId: coach.userId,
                },
              },
            },
          },
        },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      // Verify this client belongs to the coach
      if (client.coachId !== coach.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only access your own clients",
        });
      }

      return client;
    }),

  create: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        docId: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the coach profile for the authenticated user
      const coach = await ctx.db.coach.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!coach) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can create clients",
        });
      }

      // Verify the user exists
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if client already exists
      const existingClient = await ctx.db.client.findUnique({
        where: { userId: input.userId },
      });

      if (existingClient) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Client already exists",
        });
      }

      // Create the client
      return ctx.db.client.create({
        data: {
          userId: input.userId,
          coachId: coach.userId,
          docId: input.docId,
          notes: input.notes,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        docId: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the coach profile for the authenticated user
      const coach = await ctx.db.coach.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!coach) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can update clients",
        });
      }

      // Verify ownership
      const existing = await ctx.db.client.findUnique({
        where: { userId: input.id },
      });

      if (!existing || existing.coachId !== coach.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own clients",
        });
      }

      const { id, ...updateData } = input;

      return ctx.db.client.update({
        where: { userId: id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
    }),
});
