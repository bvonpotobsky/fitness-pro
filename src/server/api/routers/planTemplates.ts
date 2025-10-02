import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { PlanStatus, PlanVisibility, BlockType } from "@prisma/client";

export const planTemplatesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Get the coach profile for the authenticated user
    const coach = await ctx.db.coach.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!coach) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only coaches can list plan templates",
      });
    }

    // Get all templates for this coach
    return ctx.db.planTemplate.findMany({
      where: { coachId: coach.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        monthlyGoal: true,
        notes: true,
        status: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3),
        monthlyGoal: z.string().optional(),
        notes: z.string().optional(),
        status: z.nativeEnum(PlanStatus).default("draft"),
        visibility: z.nativeEnum(PlanVisibility).default("private"),
        days: z
          .array(
            z.object({
              dayIndex: z.number(),
              warmupText: z.string().optional(),
              notes: z.string().optional(),
              sections: z.array(
                z.object({
                  sectionId: z.number(),
                  sectionNameSnapshot: z.string(),
                  sortOrder: z.number(),
                  blocks: z.array(
                    z.object({
                      blockType: z.nativeEnum(BlockType),
                      macroRestS: z.number().optional(),
                      notes: z.string().optional(),
                      sortOrder: z.number(),
                      exercises: z.array(
                        z.object({
                          exerciseId: z.number(),
                          progressionTypeId: z.number().optional(),
                          sortOrder: z.number(),
                          microRestS: z.number().optional(),
                          tempoOverride: z.string().optional(),
                          notes: z.string().optional(),
                          microcycles: z.array(
                            z.object({
                              microIndex: z.number(),
                              sets: z.number(),
                              reps: z.string(),
                              rir: z.string().optional(),
                              load: z.string().optional(),
                              restS: z.number().optional(),
                              tempo: z.string().optional(),
                            }),
                          ),
                        }),
                      ),
                    }),
                  ),
                }),
              ),
            }),
          )
          .optional(),
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
          message: "Only coaches can create plan templates",
        });
      }

      // Create the template with nested structure
      return ctx.db.planTemplate.create({
        data: {
          coachId: coach.userId,
          createdBy: ctx.session.user.id,
          title: input.title,
          monthlyGoal: input.monthlyGoal,
          notes: input.notes,
          status: input.status,
          visibility: input.visibility,
          days: {
            create: input.days?.map((day) => ({
              dayIndex: day.dayIndex,
              warmupText: day.warmupText,
              notes: day.notes,
              sections: {
                create: day.sections.map((section) => ({
                  sectionId: section.sectionId,
                  sectionNameSnapshot: section.sectionNameSnapshot,
                  sortOrder: section.sortOrder,
                  blocks: {
                    create: section.blocks.map((block) => ({
                      blockType: block.blockType,
                      macroRestS: block.macroRestS,
                      notes: block.notes,
                      sortOrder: block.sortOrder,
                      exercises: {
                        create: block.exercises.map((exercise) => ({
                          exerciseId: exercise.exerciseId,
                          progressionTypeId: exercise.progressionTypeId,
                          sortOrder: exercise.sortOrder,
                          microRestS: exercise.microRestS,
                          tempoOverride: exercise.tempoOverride,
                          notes: exercise.notes,
                          microcycles: {
                            create: exercise.microcycles.map((micro) => ({
                              microIndex: micro.microIndex,
                              sets: micro.sets,
                              reps: micro.reps,
                              rir: micro.rir,
                              load: micro.load,
                              restS: micro.restS,
                              tempo: micro.tempo,
                            })),
                          },
                        })),
                      },
                    })),
                  },
                })),
              },
            })),
          },
        },
        include: {
          days: {
            include: {
              sections: {
                include: {
                  section: true,
                  blocks: {
                    include: {
                      exercises: {
                        include: {
                          exercise: true,
                          progressionType: true,
                          microcycles: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Get the coach profile for the authenticated user
      const coach = await ctx.db.coach.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!coach) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can access plan templates",
        });
      }

      const template = await ctx.db.planTemplate.findUnique({
        where: { id: input.id },
        include: {
          days: {
            orderBy: { dayIndex: "asc" },
            include: {
              sections: {
                orderBy: { sortOrder: "asc" },
                include: {
                  section: true,
                  blocks: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                      exercises: {
                        orderBy: { sortOrder: "asc" },
                        include: {
                          exercise: true,
                          progressionType: true,
                          microcycles: {
                            orderBy: { microIndex: "asc" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan template not found",
        });
      }

      // Verify ownership
      if (template.coachId !== coach.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only access your own plan templates",
        });
      }

      return template;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(3).optional(),
        monthlyGoal: z.string().optional(),
        notes: z.string().optional(),
        status: z.nativeEnum(PlanStatus).optional(),
        visibility: z.nativeEnum(PlanVisibility).optional(),
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
          message: "Only coaches can update plan templates",
        });
      }

      // Verify ownership
      const existing = await ctx.db.planTemplate.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.coachId !== coach.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own plan templates",
        });
      }

      const { id, ...updateData } = input;

      return ctx.db.planTemplate.update({
        where: { id },
        data: updateData,
      });
    }),
});
