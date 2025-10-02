import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Crear Users
  const coachUser = await prisma.user.create({
    data: {
      name: "Coach Demo",
      email: "coach.demo@example.com",
      emailVerified: true,
      coach: {
        create: {
          bio: "Preparador con 10 años de experiencia",
          certifications: "NSCA-CPT",
        },
      },
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      name: "Cliente Demo",
      email: "cliente.demo@example.com",
      emailVerified: true,
      client: {
        create: {
          coachId: coachUser.id,
          docId: "DNI 12.345.678",
          notes: "Atleta intermedio",
        },
      },
    },
  });

  // Progresiones del coach
  const pesado = await prisma.progressionType.create({
    data: {
      coachId: coachUser.id,
      name: "Pesado",
      colorHex: "#E53935",
      description: "Foco en cargas altas",
    },
  });

  const multi = await prisma.progressionType.create({
    data: {
      coachId: coachUser.id,
      name: "Multiarticulares",
      colorHex: "#1E88E5",
      description: "Predominio de compuestos",
    },
  });

  const mono = await prisma.progressionType.create({
    data: {
      coachId: coachUser.id,
      name: "Monoarticulares",
      colorHex: "#43A047",
      description: "Aislamiento / accesorios",
    },
  });

  // Ejercicios base
  const pressPlano = await prisma.exercise.create({
    data: {
      name: "PRESS BANCO PLANO CON BARRA",
      groupMuscular: "Pecho",
      pattern: "Empuje",
      equipment: "Barra",
      mmAxis: "MMSS",
      defaultTempo: "3010",
    },
  });

  const russianTwist = await prisma.exercise.create({
    data: {
      name: "RUSSIAN TWIST CON PESO",
      groupMuscular: "Core",
      pattern: "Rotación",
      equipment: "Mancuernas",
      mmAxis: "Mixto",
      defaultTempo: "2010",
    },
  });

  // Secciones
  const secCore = await prisma.section.create({
    data: {
      name: "Circuito Core",
      description: "Trabajo de core en circuito",
      isGlobalTemplate: true,
    },
  });

  const secFuerza = await prisma.section.create({
    data: {
      name: "Fuerza Estación",
      description: "Fuerza en estaciones",
      isGlobalTemplate: true,
    },
  });

  // PlanTemplate base
  const template = await prisma.planTemplate.create({
    data: {
      coachId: coachUser.id,
      title: "Plantilla Hipertrofia Pecho",
      monthlyGoal: "Hipertrofia del tren superior",
      createdBy: coachUser.id,
      days: {
        create: [
          {
            dayIndex: 1,
            warmupText: "Bici 5' + Movilidad articular",
            sections: {
              create: [
                {
                  sectionId: secCore.id,
                  sectionNameSnapshot: secCore.name,
                  sortOrder: 1,
                  blocks: {
                    create: [
                      {
                        blockType: "circuit",
                        sortOrder: 1,
                        exercises: {
                          create: [
                            {
                              exerciseId: russianTwist.id,
                              progressionTypeId: mono.id,
                              sortOrder: 1,
                              microcycles: {
                                create: [
                                  {
                                    microIndex: 1,
                                    sets: 3,
                                    reps: "10",
                                    rir: "3RIR",
                                  },
                                  {
                                    microIndex: 2,
                                    sets: 3,
                                    reps: "12",
                                    rir: "2RIR",
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  sectionId: secFuerza.id,
                  sectionNameSnapshot: secFuerza.name,
                  sortOrder: 2,
                  blocks: {
                    create: [
                      {
                        blockType: "series",
                        sortOrder: 1,
                        exercises: {
                          create: [
                            {
                              exerciseId: pressPlano.id,
                              progressionTypeId: pesado.id,
                              sortOrder: 1,
                              microcycles: {
                                create: [
                                  {
                                    microIndex: 1,
                                    sets: 3,
                                    reps: "6",
                                    rir: "3RIR",
                                  },
                                  {
                                    microIndex: 2,
                                    sets: 3,
                                    reps: "5",
                                    rir: "3RIR",
                                  },
                                  {
                                    microIndex: 3,
                                    sets: 4,
                                    reps: "5",
                                    rir: "2RIR",
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Seed completo ✅", {
    coach: coachUser.email,
    client: clientUser.email,
    template: template.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
