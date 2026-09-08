import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Records a project activity entry. Never throws — a failed log must not fail the request. */
export async function logActivity(params: {
  projectId: string;
  actorId: string;
  action: string;
  summary: string;
  meta?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.activity.create({ data: params });
  } catch (error) {
    console.error("Failed to record activity", error);
  }
}
