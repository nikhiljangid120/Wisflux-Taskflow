// src/gateway/gateway.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TaskflowGateway } from './taskflow.gateway';

@Module({
  imports: [
    // We need JwtService for verifying tokens in handleConnection.
    // We register it without options here — the secret is read from ConfigService
    // at verify() time via config.getOrThrow(), so no forRootAsync needed.
    JwtModule.register({}),
  ],
  providers: [TaskflowGateway],
  exports: [TaskflowGateway],
})
export class GatewayModule {}