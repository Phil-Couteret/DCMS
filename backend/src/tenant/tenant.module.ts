import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantContext } from './tenant-context.service.js';
import { TenantMiddleware } from './tenant.middleware.js';
import { TenantsService } from './tenants.service.js';

@Global()
@Module({
  providers: [TenantContext, TenantsService],
  exports: [TenantContext, TenantsService],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
