import { Inject, Injectable } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByXrpAddress(xrpAddress: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { xrpAddress } });
  }

  createUser(input: {
    username: string;
    email: string;
    passwordHash: string;
    xrpAddress?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        xrpAddress: input.xrpAddress
      }
    });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  findMany(
    filter?: { verificationStatus?: string },
    pagination?: { skip: number; take: number }
  ): Promise<User[]> {
    return this.prisma.user.findMany({
      where: filter,
      skip: pagination?.skip,
      take: pagination?.take,
      orderBy: { createdAt: "desc" }
    });
  }

  count(filter?: { verificationStatus?: string }): Promise<number> {
    return this.prisma.user.count({ where: filter });
  }
}
