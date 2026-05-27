import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { UsersService } from "../users/users.service.js";
import { AuthUserProfile, JwtPayload } from "./auth.types.js";

const registerSchema = {
  username: /^[a-zA-Z0-9_]{3,64}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(JwtService) private readonly jwtService: JwtService
  ) {}

  private toProfile(user: {
    id: string;
    username: string;
    email: string;
    role: string;
    xrpAddress: string | null;
    verificationStatus: string;
    gkcBalance: { toNumber: () => number } | number;
    xrpBalance: { toNumber: () => number } | number;
  }): AuthUserProfile {
    const readNumber = (value: { toNumber: () => number } | number) =>
      typeof value === "number" ? value : value.toNumber();

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      xrpAddress: user.xrpAddress,
      verificationStatus: user.verificationStatus,
      gkcBalance: readNumber(user.gkcBalance),
      xrpBalance: readNumber(user.xrpBalance)
    };
  }

  private async buildToken(userId: string, role: string) {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwtService.signAsync(payload);
  }

  async register(input: { username: string; email: string; password: string }) {
    if (!registerSchema.username.test(input.username)) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: "Username must be 3-64 chars with letters, numbers, underscores."
      });
    }

    if (!registerSchema.password.test(input.password)) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: "Password must include uppercase, lowercase, and number with minimum 8 chars."
      });
    }

    const existed = await this.usersService.findByEmail(input.email);
    if (existed) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: "Email already registered."
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.usersService.createUser({
      username: input.username,
      email: input.email,
      passwordHash
    });

    const token = await this.buildToken(user.id, user.role);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      token,
      verificationStatus: "pending",
      message: "帳號已建立，等待管理員審核。"
    };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Email or password is invalid."
      });
    }

    const passwordMatched = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatched) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Email or password is invalid."
      });
    }

    const token = await this.buildToken(user.id, user.role);

    return {
      token,
      expires_in: Number.parseInt(process.env.JWT_EXPIRES_IN ?? "86400", 10),
      user: this.toProfile(user)
    };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "User session is invalid."
      });
    }

    return this.toProfile(user);
  }
}
