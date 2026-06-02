import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

const DEMO_USERNAME = "demo_user_1";
const DEMO_PASSWORD = "demo1234";

interface NodeSession {
  username: string;
  connectedAt: Date;
}

@Injectable()
export class NodeOsService {
  private readonly sessions = new Map<string, NodeSession>();

  login(username: string, password: string) {
    if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Invalid credentials."
      });
    }

    const token = randomUUID();
    this.sessions.set(token, { username, connectedAt: new Date() });

    return { ok: true, token, username };
  }

  logout(token: string) {
    this.sessions.delete(token);
    return { ok: true };
  }

  getStatus() {
    const nodes = Array.from(this.sessions.values()).map((s) => ({
      username: s.username,
      connectedAt: s.connectedAt.toISOString()
    }));
    return { activeNodes: nodes.length, nodes };
  }
}
