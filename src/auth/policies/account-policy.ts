export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 64;
export const PASSWORD_MIN_LENGTH = 8;

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,64}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const ACCOUNT_POLICY_MESSAGES = {
  usernameInvalid: "Username must be 3-64 chars with letters, numbers, underscores.",
  passwordInvalid: "Password must include uppercase, lowercase, and number with minimum 8 chars."
} as const;

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}
