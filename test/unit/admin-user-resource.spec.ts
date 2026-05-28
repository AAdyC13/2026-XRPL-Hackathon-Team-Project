import bcrypt from "bcrypt";
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { createUserResource } from "../../admin/user-resource.js";

describe("Admin user resource", () => {
  it("defines expected new and edit properties", () => {
    const resource = createUserResource({} as PrismaClient);
    const options = resource.options ?? {};

    expect(options.editProperties).toEqual([
      "username",
      "email",
      "verificationStatus",
      "role",
      "isActive",
      "newPassword"
    ]);
  });

  it("rejects new action when required fields are missing", async () => {
    const resource = createUserResource({} as PrismaClient);
    const beforeHook = resource.options?.actions?.new?.before;

    await expect(beforeHook?.({ payload: { username: "valid_user" } } as never)).rejects.toThrow(
      "username, email and newPassword are required."
    );
  });

  it("maps valid new action payload to passwordHash and defaults", async () => {
    const resource = createUserResource({} as PrismaClient);
    const beforeHook = resource.options?.actions?.new?.before;

    const request = {
      payload: {
        username: "valid_user",
        email: "valid@example.com",
        newPassword: "ValidPassword1"
      }
    } as never;

    const nextRequest = await beforeHook?.(request);
    const nextPayload = nextRequest?.payload as Record<string, unknown>;

    expect(nextPayload.username).toBe("valid_user");
    expect(nextPayload.email).toBe("valid@example.com");
    expect(nextPayload.role).toBe("user");
    expect(nextPayload.verificationStatus).toBe("pending");
    expect(nextPayload.isActive).toBe(true);
    expect(typeof nextPayload.passwordHash).toBe("string");
    expect(await bcrypt.compare("ValidPassword1", String(nextPayload.passwordHash))).toBe(true);
  });

  it("filters username and email out of edit payload", async () => {
    const resource = createUserResource({} as PrismaClient);
    const beforeHook = resource.options?.actions?.edit?.before;

    const request = {
      payload: {
        username: "should_not_update",
        email: "should-not-update@example.com",
        role: "provider",
        isActive: "false",
        newPassword: "ValidPassword1"
      }
    } as never;

    const nextRequest = await beforeHook?.(request);
    const nextPayload = nextRequest?.payload as Record<string, unknown>;

    expect(nextPayload.username).toBeUndefined();
    expect(nextPayload.email).toBeUndefined();
    expect(nextPayload.role).toBe("provider");
    expect(nextPayload.isActive).toBe("false");
    expect(typeof nextPayload.passwordHash).toBe("string");
  });
});
