import { Module } from "@nestjs/common";
import { NodeOsController } from "./node-os.controller.js";
import { NodeOsService } from "./node-os.service.js";

@Module({
  controllers: [NodeOsController],
  providers: [NodeOsService]
})
export class NodeOsModule {}
