import { getModelByName } from "@adminjs/prisma";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { ResourceWithOptions } from "adminjs";
import { createUserResource } from "./user-resource.js";

const sensitiveFieldPattern = /(password|hash|secret|token)/i;
const resourceActionDenyList = new Set<string>([]);

function buildSensitiveProperties(modelName: string): NonNullable<ResourceWithOptions["options"]>["properties"] {
  const model = Prisma.dmmf.datamodel.models.find((entry) => entry.name === modelName);
  if (!model) {
    return {};
  }

  return Object.fromEntries(
    model.fields
      .filter((field) => sensitiveFieldPattern.test(field.name))
      .map((field) => [field.name, { isVisible: false }])
  );
}

function createGenericResource(modelName: string, prisma: PrismaClient): ResourceWithOptions {
  const actions = resourceActionDenyList.has(modelName)
    ? {
        new: { isAccessible: false },
        delete: { isAccessible: false },
        bulkDelete: { isAccessible: false }
      }
    : {};

  return {
    resource: {
      model: getModelByName(modelName),
      client: prisma
    },
    options: {
      navigation: {
        name: "Database",
        icon: "Database"
      },
      properties: buildSensitiveProperties(modelName),
      actions
    }
  };
}

export function buildAdminResources(prisma: PrismaClient): ResourceWithOptions[] {
  const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);
  const overrides: Partial<Record<string, ResourceWithOptions>> = {
    User: createUserResource(prisma)
  };

  return modelNames.map((modelName) => overrides[modelName] ?? createGenericResource(modelName, prisma));
}
