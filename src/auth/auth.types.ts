export type AuthUserProfile = {
  id: string;
  username: string;
  email: string;
  role: string;
  xrpAddress: string | null;
  verificationStatus: string;
};

export type JwtPayload = {
  sub: string;
  role: string;
};
