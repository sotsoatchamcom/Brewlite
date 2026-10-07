import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'SECRET_KEY_BREWLITE_2026', // Phải khớp với secret key trong AuthModule
    });
  }

  async validate(payload: any) {
    // Trả về thông tin user được bọc trong token
    return { userId: payload.sub, email: payload.email, role: payload.role };  }
}
