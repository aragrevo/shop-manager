import { z } from "zod";
import { requireStoreAccess } from "../../server/auth/permissions";
import {
  getStoreById,
  listStoreMembers,
  updateStoreSettings,
} from "../../server/services/stores";
import { handler } from "../_lib/handler";

const settingsInput = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  taxId: z.string().trim().max(30).nullable().optional(),
  currency: z.string().trim().length(3).optional(),
  timezone: z.string().trim().max(60).optional(),
});

export default handler({
  GET: async ({ req, user }) => {
    const storeId = String(req.query.id);
    await requireStoreAccess(user!.id, storeId, "employee");
    const store = await getStoreById(storeId);
    if (req.query.members === "true") {
      const members = await listStoreMembers(storeId);
      return { store, members };
    }
    return { store };
  },
  PATCH: async ({ req, user, body }) => {
    const storeId = String(req.query.id);
    await requireStoreAccess(user!.id, storeId, "admin");
    const input = settingsInput.parse(body);
    const store = await updateStoreSettings(storeId, input);
    return { store };
  },
});
