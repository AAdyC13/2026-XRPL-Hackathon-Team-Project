import path from "node:path";
import { fileURLToPath } from "node:url";
import { ComponentLoader } from "adminjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const componentLoader = new ComponentLoader();

export const AdminComponents = {
  TreasuryPage: componentLoader.add(
    "TreasuryPage",
    path.join(__dirname, "components", "treasury-page")
  )
};
