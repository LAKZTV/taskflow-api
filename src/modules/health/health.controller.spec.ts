import { HealthController } from './health.controller';

describe('HealthController', () => {
  // live() and version() touch no dependencies, so the terminus services can be stubs.
  const controller = new HealthController({} as never, {} as never);

  it('live() reports ok', () => {
    expect(controller.live().status).toBe('ok');
  });

  it('version() falls back to "dev" outside CI', () => {
    delete process.env.GIT_COMMIT;
    expect(controller.version()).toEqual({ name: 'poonsuk-api', commit: 'dev' });
  });

  it('version() reports the commit that built the image', () => {
    process.env.GIT_COMMIT = 'abc1234';
    expect(controller.version().commit).toBe('abc1234');
    delete process.env.GIT_COMMIT;
  });
});
