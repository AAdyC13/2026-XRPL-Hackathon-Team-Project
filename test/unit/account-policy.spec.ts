import { describe, expect, it } from "vitest";
import {
  ACCOUNT_POLICY_MESSAGES,
  isValidPassword,
  isValidUsername
} from "../../src/auth/policies/account-policy.js";

describe("AccountPolicy", () => {
  it("accepts valid username and rejects invalid username", () => {
    expect(isValidUsername("valid_user_01")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("invalid-user")).toBe(false);
  });

  it("accepts strong password and rejects weak password", () => {
    expect(isValidPassword("ValidPassword1")).toBe(true);
    expect(isValidPassword("weak")).toBe(false);
    expect(isValidPassword("alllowercase123")).toBe(false);
    expect(isValidPassword("ALLUPPERCASE123")).toBe(false);
    expect(isValidPassword("NoDigitsHere")).toBe(false);
  });

  it("exports stable error messages for auth and admin", () => {
    expect(ACCOUNT_POLICY_MESSAGES.usernameInvalid).toBe(
      "Username must be 3-64 chars with letters, numbers, underscores."
    );
    expect(ACCOUNT_POLICY_MESSAGES.passwordInvalid).toBe(
      "Password must include uppercase, lowercase, and number with minimum 8 chars."
    );
  });
});
