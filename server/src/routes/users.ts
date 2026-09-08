import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async.js";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect } from "../lib/serializers.js";

const router = Router();

/** GET /api/users/search?q= - typeahead used when adding people to a project. */
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { q } = z.object({ q: z.string().trim().min(1) }).parse(req.query);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: publicUserSelect,
      take: 8,
      orderBy: { name: "asc" },
    });

    res.json({ users });
  }),
);

export default router;
