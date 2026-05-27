import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../../src/auth/auth.service.js";
import { UsersService } from "../../src/users/users.service.js";

describe("AuthService", () => {
  let usersService: Pick<UsersService, "findByEmail" | "findById" | "createUser">;
  let jwtService: Pick<JwtService, "signAsync">;
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      createUser: vi.fn()
    };
    jwtService = {
      signAsync: vi.fn().mockResolvedValue("jwt-token")
    };
    service = new AuthService(usersService as UsersService, jwtService as JwtService);
  });

  it("rejects weak password during register", async () => {
    await expect(
      service.register({
        username: "valid_user",
        email: "valid@example.com",
        password: "weak"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects duplicate email during register", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue({
      id: "u1",
      username: "demo",
      email: "demo@example.com",
      passwordHash: "hash",
      role: "user",
      xrpAddress: null,
      gkcBalance: 0 as never,
      xrpBalance: 0 as never,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await expect(
      service.register({
        username: "valid_user",
        email: "demo@example.com",
        password: "ValidPassword1"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("registers successfully with valid input", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue(null);
    vi.mocked(usersService.createUser).mockResolvedValue({
      id: "u2",
      username: "valid_user",
      email: "valid@example.com",
      passwordHash: "hash",
      role: "user",
      xrpAddress: null,
      gkcBalance: 0 as never,
      xrpBalance: 0 as never,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await service.register({
      username: "valid_user",
      email: "valid@example.com",
      password: "ValidPassword1"
    });

    expect(result).toMatchObject({
      id: "u2",
      username: "valid_user",
      email: "valid@example.com",
      token: "jwt-token"
    });
  });

  it("rejects login when password is incorrect", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue({
      id: "u3",
      username: "demo",
      email: "demo@example.com",
      passwordHash: "$2b$12$BptA1HqfPXc8eR1fV4MW6eKjR4ZqA0v3WSkMxxVx0H9X1vT0.gVq2",
      role: "user",
      xrpAddress: null,
      gkcBalance: 0 as never,
      xrpBalance: 0 as never,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await expect(
      service.login({
        email: "demo@example.com",
        password: "WrongPassword1"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
