export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 64;
export const PASSWORD_MIN_LENGTH = 8;

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,64}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const ACCOUNT_POLICY_MESSAGES_ZH = {
  usernameInvalid: "使用者名稱需為 3-64 個字元，且僅能包含英文字母、數字與底線。",
  passwordInvalid: "密碼至少 8 碼，且需包含英文大寫、英文小寫與數字。"
} as const;

const BACKEND_POLICY_MESSAGE_MAP: Record<string, string> = {
  "Username must be 3-64 chars with letters, numbers, underscores.":
    ACCOUNT_POLICY_MESSAGES_ZH.usernameInvalid,
  "Password must include uppercase, lowercase, and number with minimum 8 chars.":
    ACCOUNT_POLICY_MESSAGES_ZH.passwordInvalid
};

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export function toZhAccountPolicyMessage(message: string): string {
  return BACKEND_POLICY_MESSAGE_MAP[message] ?? message;
}
