// States and districts for the district picker (State → District).
import { prisma } from "../db";
import { notFound } from "../errors";

export async function listStates() {
  const states = await prisma.state.findMany({ orderBy: { name: "asc" } });
  return { states };
}

export async function listDistricts(stateCode: string) {
  const state = await prisma.state.findUnique({ where: { code: stateCode.toUpperCase() } });
  if (!state) throw notFound("State");
  const districts = await prisma.district.findMany({
    where: { stateCode: state.code },
    select: { code: true, name: true, altName: true, zoneCode: true, associationId: true },
    orderBy: { name: "asc" },
  });
  return { state, districts };
}

/** Everything the app's district picker and scope bar need, in one small download (cached by the app). */
export async function allPlaces() {
  const [states, districts] = await Promise.all([
    prisma.state.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { districts: true } } } }),
    prisma.district.findMany({
      select: { code: true, name: true, stateCode: true, altName: true, zoneCode: true, associationId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    states: states.map((s) => ({ code: s.code, name: s.name, type: s.type, districtCount: s._count.districts })),
    districts,
  };
}
