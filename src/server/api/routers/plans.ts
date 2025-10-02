import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { PlanStatus, PlanVisibility, BlockType } from "@prisma/client";

export const plansRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        title: z.string().min(3),
        dateStart: z.date(),
        dateEnd: z.date(),
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
          message: "Only coaches can create plans",
        });
      }

      // Verify the client exists
      const client = await ctx.db.client.findUnique({
        where: { userId: input.clientId },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      // Get the next plan number for this client
      const lastPlan = await ctx.db.plan.findFirst({
        where: { clientId: input.clientId },
        orderBy: { planNumberPerClient: "desc" },
      });

      const planNumberPerClient = (lastPlan?.planNumberPerClient ?? 0) + 1;

      // Create the plan with nested structure
      return ctx.db.plan.create({
        data: {
          clientId: input.clientId,
          coachId: coach.userId,
          createdBy: ctx.session.user.id,
          planNumberPerClient,
          title: input.title,
          dateStart: input.dateStart,
          dateEnd: input.dateEnd,
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
      const plan = await ctx.db.plan.findUnique({
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

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      // Verify access: either the coach who created it or the client it's assigned to
      const coach = await ctx.db.coach.findUnique({
        where: { userId: ctx.session.user.id },
      });

      const client = await ctx.db.client.findUnique({
        where: { userId: ctx.session.user.id },
      });

      const hasAccess =
        (coach && plan.coachId === coach.userId) ||
        (client && plan.clientId === client.userId);

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this plan",
        });
      }

      return plan;
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get the coach profile for the authenticated user
      const coach = await ctx.db.coach.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!coach) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can publish plans",
        });
      }

      // Verify ownership
      const existing = await ctx.db.plan.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.coachId !== coach.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only publish your own plans",
        });
      }

      return ctx.db.plan.update({
        where: { id: input.id },
        data: { status: "published" },
      });
    }),

  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(3),
        clientId: z.string().optional(),
        dateStart: z.date().optional(),
        dateEnd: z.date().optional(),
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
          message: "Only coaches can duplicate plans",
        });
      }

      // Get the source plan with all nested data
      const sourcePlan = await ctx.db.plan.findUnique({
        where: { id: input.id },
        include: {
          days: {
            orderBy: { dayIndex: "asc" },
            include: {
              sections: {
                orderBy: { sortOrder: "asc" },
                include: {
                  blocks: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                      exercises: {
                        orderBy: { sortOrder: "asc" },
                        include: {
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

      if (!sourcePlan || sourcePlan.coachId !== coach.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only duplicate your own plans",
        });
      }

      // Use the provided clientId or keep the original
      const targetClientId = input.clientId ?? sourcePlan.clientId;

      // Verify the client exists
      const client = await ctx.db.client.findUnique({
        where: { userId: targetClientId },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      // Get the next plan number for this client
      const lastPlan = await ctx.db.plan.findFirst({
        where: { clientId: targetClientId },
        orderBy: { planNumberPerClient: "desc" },
      });

      const planNumberPerClient = (lastPlan?.planNumberPerClient ?? 0) + 1;

      // Create the duplicated plan
      return ctx.db.plan.create({
        data: {
          clientId: targetClientId,
          coachId: coach.userId,
          createdBy: ctx.session.user.id,
          planNumberPerClient,
          title: input.title,
          dateStart: input.dateStart ?? sourcePlan.dateStart,
          dateEnd: input.dateEnd ?? sourcePlan.dateEnd,
          monthlyGoal: sourcePlan.monthlyGoal,
          notes: sourcePlan.notes,
          status: "draft",
          visibility: sourcePlan.visibility,
          days: {
            create: sourcePlan.days.map((day) => ({
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

  fromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        clientId: z.string(),
        title: z.string().min(3),
        dateStart: z.date(),
        dateEnd: z.date(),
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
          message: "Only coaches can create plans from templates",
        });
      }

      // Get the source template with all nested data
      const sourceTemplate = await ctx.db.planTemplate.findUnique({
        where: { id: input.templateId },
        include: {
          days: {
            orderBy: { dayIndex: "asc" },
            include: {
              sections: {
                orderBy: { sortOrder: "asc" },
                include: {
                  blocks: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                      exercises: {
                        orderBy: { sortOrder: "asc" },
                        include: {
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

      if (!sourceTemplate || sourceTemplate.coachId !== coach.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only create plans from your own templates",
        });
      }

      // Verify the client exists
      const client = await ctx.db.client.findUnique({
        where: { userId: input.clientId },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      // Get the next plan number for this client
      const lastPlan = await ctx.db.plan.findFirst({
        where: { clientId: input.clientId },
        orderBy: { planNumberPerClient: "desc" },
      });

      const planNumberPerClient = (lastPlan?.planNumberPerClient ?? 0) + 1;

      // Create the plan from template
      return ctx.db.plan.create({
        data: {
          clientId: input.clientId,
          coachId: coach.userId,
          createdBy: ctx.session.user.id,
          planNumberPerClient,
          title: input.title,
          dateStart: input.dateStart,
          dateEnd: input.dateEnd,
          monthlyGoal: sourceTemplate.monthlyGoal,
          notes: sourceTemplate.notes,
          status: "draft",
          visibility: sourceTemplate.visibility,
          days: {
            create: sourceTemplate.days.map((day) => ({
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
});
