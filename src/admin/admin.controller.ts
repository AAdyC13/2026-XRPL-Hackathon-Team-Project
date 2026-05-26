import {
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AdminGuard } from "./admin.guard.js";
import { AdminService } from "./admin.service.js";

@Controller("/api/v1/admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get("/users")
  async listUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string
  ) {
    const pageNum = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit ?? "20", 10) || 20));
    return this.adminService.listUsers(pageNum, limitNum, status || undefined);
  }

  @Patch("/users/:id/approve")
  async approveUser(@Param("id") id: string) {
    return this.adminService.approveUser(id);
  }

  @Patch("/users/:id/reject")
  async rejectUser(@Param("id") id: string) {
    return this.adminService.rejectUser(id);
  }

  @Patch("/users/:id/reset")
  async resetUser(@Param("id") id: string) {
    return this.adminService.resetUser(id);
  }
}
