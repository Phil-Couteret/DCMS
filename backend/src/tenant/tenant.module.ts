import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantConfig } from './tenant-config.service.js';
import { TenantContext } from './tenant-context.service.js';
import { TenantMiddleware } from './tenant.middleware.js';
import { TenantsService } from './tenants.service.js';

@Global()
@Module({
  providers: [TenantContext, TenantsService, TenantConfig],
  exports: [TenantContext, TenantsService, TenantConfig],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
