// src/users/users.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './user-enum.role';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)  // applied to ALL routes in this controller
@Controller('users')
export class UsersController {
  @Get('me')
  // No @Roles() here → any authenticated user can access
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Get('admin-only')
  @Roles(UserRole.ADMIN)
  adminOnly() {
    return { message: 'You see this only if you are ADMIN' };
  }
}