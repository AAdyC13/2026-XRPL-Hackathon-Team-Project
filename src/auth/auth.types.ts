export type AuthUserProfile = {
  id: string;
  username: string;
  email: string;
  role: string;
  xrpAddress: string | null;
  gkcBalance: number;
  xrpBalance: number;
  verificationStatus: string;
};

export type JwtPayload = {
  sub: string;
  role: string;
};
