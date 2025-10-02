import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const progressionTypesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Get the coach profile for the authenticated user
    const coach = await ctx.db.coach.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!coach) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only coaches can access progression types",
      });
    }

    return ctx.db.progressionType.findMany({
      where: { coachId: coach.userId },
      orderBy: { name: "asc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
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
          message: "Only coaches can create progression types",
        });
      }

      return ctx.db.progressionType.create({
        data: {
          coachId: coach.userId,
          name: input.name,
          colorHex: input.colorHex,
          description: input.description,
          isActive: input.isActive,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
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
          message: "Only coaches can update progression types",
        });
      }

      // Verify ownership
      const existing = await ctx.db.progressionType.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.coachId !== coach.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own progression types",
        });
      }

      const { id, ...updateData } = input;

      return ctx.db.progressionType.update({
        where: { id },
        data: updateData,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get the coach profile for the authenticated user
      const coach = await ctx.db.coach.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!coach) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can delete progression types",
        });
      }

      // Verify ownership
      const existing = await ctx.db.progressionType.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.coachId !== coach.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own progression types",
        });
      }

      return ctx.db.progressionType.delete({
        where: { id: input.id },
      });
    }),
});
