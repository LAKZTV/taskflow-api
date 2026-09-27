import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  /** Process is up. Never touches dependencies — used for restart decisions. */
  @Get('live')
  live() {
    return { status: 'ok', uptime: process.uptime() };
  }

  /** Which build is serving — lets a deploy or smoke test confirm the version. */
  @Get('version')
  version() {
    return { name: 'poonsuk-api', commit: process.env.GIT_COMMIT ?? 'dev' };
  }

  /** Dependencies reachable. Used by Nginx/orchestrator to route traffic. */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.pingCheck('database', { timeout: 1500 })]);
  }
}
