export type AuthUserProfile = {
  id: string;
  username: string;
  email: string;
  role: string;
  xrpAddress: string | null;
  verificationStatus: string;
  isActive: boolean;
};

export type JwtPayload = {
  sub: string;
  role: string;
};
