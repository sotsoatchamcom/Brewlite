import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy'; // Import JwtStrategy
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    JwtModule.register({
      global: true,
      secret: 'SECRET_KEY_BREWLITE_2026', // Khớp với secret key trong JwtStrategy
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController], //[cite: 5]
  providers: [AuthService, JwtStrategy], //[cite: 5]
})
export class AuthModule {}
