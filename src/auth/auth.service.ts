import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { UsersService } from "../users/users.service.js";
import { AuthUserProfile, JwtPayload } from "./auth.types.js";
import {
  ACCOUNT_POLICY_MESSAGES,
  isValidPassword,
  isValidUsername
} from "./policies/account-policy.js";

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
    isActive: boolean;
  }): AuthUserProfile {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      xrpAddress: user.xrpAddress,
      verificationStatus: user.verificationStatus,
      isActive: user.isActive,
    };
  }

  private async buildToken(userId: string, role: string) {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwtService.signAsync(payload);
  }

  async register(input: { username: string; email: string; password: string }) {
    if (!isValidUsername(input.username)) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: ACCOUNT_POLICY_MESSAGES.usernameInvalid
      });
    }

    if (!isValidPassword(input.password)) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: ACCOUNT_POLICY_MESSAGES.passwordInvalid
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
      passwordHash,
      verificationStatus: "verified"
    });

    const token = await this.buildToken(user.id, user.role);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        xrpAddress: user.xrpAddress,
        verificationStatus: user.verificationStatus,
        isActive: user.isActive,
      }
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
