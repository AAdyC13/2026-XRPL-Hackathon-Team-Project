import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UsersService } from "../users/users.service.js";

export interface AdminUserDto {
  id: string;
  username: string;
  email: string;
  role: string;
  verificationStatus: string;
  xrpAddress: string | null;
  createdAt: Date;
}

@Injectable()
export class AdminService {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  private toDto(user: {
    id: string;
    username: string;
    email: string;
    role: string;
    verificationStatus: string;
    xrpAddress: string | null;
    createdAt: Date;
  }): AdminUserDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      verificationStatus: user.verificationStatus,
      xrpAddress: user.xrpAddress,
      createdAt: user.createdAt
    };
  }

  async listUsers(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const filter = status ? { verificationStatus: status } : undefined;
    const [users, total] = await Promise.all([
      this.usersService.findMany(filter, { skip, take: limit }),
      this.usersService.count(filter)
    ]);

    return {
      users: users.map((u) => this.toDto(u)),
      total,
      page,
      limit
    };
  }

  async approveUser(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "User not found." });
    }

    const updated = await this.usersService.updateUser(id, {
      verificationStatus: "verified",
      verifiedAt: new Date()
    });

    return this.toDto(updated);
  }

  async rejectUser(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "User not found." });
    }

    const updated = await this.usersService.updateUser(id, {
      verificationStatus: "rejected"
    });

    return this.toDto(updated);
  }

  async resetUser(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "User not found." });
    }

    const updated = await this.usersService.updateUser(id, {
      verificationStatus: "pending"
    });

    return this.toDto(updated);
  }

  async deactivateUser(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "User not found." });
    }

    const updated = await this.usersService.updateUser(id, {
      isActive: false
    });

    return this.toDto(updated);
  }
}
