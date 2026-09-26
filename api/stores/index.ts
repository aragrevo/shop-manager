import { z } from "zod";
import {
  createStore,
  getDefaultStoreForUser,
  listStoresForUser,
} from "../../server/services/stores";
import { handler } from "../_lib/handler";

const storeInput = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  taxId: z.string().trim().max(30).optional(),
  currency: z.string().trim().length(3).optional(),
  timezone: z.string().trim().max(60).optional(),
});

export default handler({
  GET: async ({ user }) => {
    const stores = await listStoresForUser(user!.id);
    const fallback = await getDefaultStoreForUser(user!.id);
    return { stores, defaultStoreId: fallback?.id ?? null };
  },
  POST: async ({ user, body }) => {
    const input = storeInput.parse(body);
    return createStore(user!.id, input);
  },
});
