import { getModelByName } from "@adminjs/prisma";
import type { PrismaClient } from "@prisma/client";
import type {
  Action,
  ActionRequest,
  ActionResponse,
  BaseRecord,
  CurrentAdmin,
  ResourceWithOptions
} from "adminjs";
import { auditAdminEvent } from "./audit.js";

const editableUserProperties = ["verificationStatus", "role", "isActive"];

type ActionContext = {
  currentAdmin?: CurrentAdmin & { role?: string; email?: string };
  record?: BaseRecord;
};

type UserAction = Partial<Action<ActionResponse>>;

function assertAdmin(context: ActionContext) {
  if (context.currentAdmin?.role !== "admin") {
    throw new Error("Admin access only.");
  }
}

function userAction(
  name: string,
  update: Record<string, unknown>,
  message: string
): UserAction {
  return {
    actionType: "record",
    component: false,
    icon: "Settings",
    guard: message,
    handler: async (
      _request: ActionRequest,
      _response: ActionResponse,
      context: ActionContext
    ): Promise<ActionResponse> => {
      assertAdmin(context);

      const record = context.record;
      if (!record) {
        throw new Error("User record not found.");
      }

      await record.update(update);
      auditAdminEvent(`user_${name}`, {
        userId: record.id(),
          admin: context.currentAdmin?.email
      });

      return {
        record: record.toJSON(context.currentAdmin),
        notice: {
          message,
          type: "success"
        }
      };
    }
  };
}

export function createUserResource(prisma: PrismaClient): ResourceWithOptions {
  return {
    resource: {
      model: getModelByName("User"),
      client: prisma
    },
    options: {
      navigation: {
        name: "Account Management",
        icon: "User"
      },
      listProperties: ["email", "username", "role", "verificationStatus", "isActive", "createdAt"],
      showProperties: [
        "id",
        "email",
        "username",
        "role",
        "verificationStatus",
        "verifiedAt",
        "xrpAddress",
        "gkcBalance",
        "xrpBalance",
        "isActive",
        "createdAt",
        "updatedAt"
      ],
      editProperties: editableUserProperties,
      filterProperties: ["email", "username", "role", "verificationStatus", "isActive", "createdAt"],
      properties: {
        passwordHash: { isVisible: false },
        xamanUserToken: { isVisible: false },
        id: { isTitle: false, isDisabled: true },
        email: { isTitle: true, isDisabled: true },
        username: { isDisabled: true },
        gkcBalance: { isDisabled: true },
        xrpBalance: { isDisabled: true },
        xrpAddress: { isDisabled: true },
        createdAt: { isDisabled: true },
        updatedAt: { isDisabled: true },
        verifiedAt: { isDisabled: true },
        role: {
          availableValues: [
            { value: "user", label: "User" },
            { value: "node_owner", label: "Node Owner" },
            { value: "provider", label: "Provider" },
            { value: "admin", label: "Admin" }
          ]
        },
        verificationStatus: {
          availableValues: [
            { value: "pending", label: "Pending" },
            { value: "verified", label: "Verified" },
            { value: "rejected", label: "Rejected" }
          ]
        }
      },
      actions: {
        new: { isAccessible: false },
        delete: { isAccessible: false },
        bulkDelete: { isAccessible: false },
        edit: {
          before: async (request: ActionRequest) => {
            request.payload = Object.fromEntries(
              Object.entries(request.payload ?? {}).filter(([key]) => editableUserProperties.includes(key))
            );
            return request;
          },
          after: async (response: ActionResponse, request: ActionRequest, context: ActionContext) => {
            auditAdminEvent("user_edit", {
              userId: context.record?.id(),
              admin: context.currentAdmin?.email,
              fields: Object.keys(request.payload ?? {})
            });
            return response;
          }
        },
        approve: userAction("approve", { verificationStatus: "verified", verifiedAt: new Date() }, "Approve user"),
        reject: userAction("reject", { verificationStatus: "rejected", verifiedAt: null }, "Reject user"),
        reset: userAction("reset", { verificationStatus: "pending", verifiedAt: null }, "Reset user review"),
        activate: userAction("activate", { isActive: true }, "Activate user"),
        deactivate: userAction("deactivate", { isActive: false }, "Deactivate user")
      }
    }
  };
}
