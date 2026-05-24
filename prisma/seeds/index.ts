import type { SeedDefinition } from "./types.js";
import { seed001DemoUser } from "./001_demo_user.js";
import { seed002AdminUser } from "./002_admin_user.js";

/** Ordered bootstrap seeds — add 003_*.ts here for future data migrations. */
export const seeds: SeedDefinition[] = [seed001DemoUser, seed002AdminUser];
