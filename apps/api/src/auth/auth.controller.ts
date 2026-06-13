import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard, CurrentUser, JwtPayload } from './auth.guards';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() mission?: string;
  @IsOptional() @IsString() vision?: string;
  @IsOptional() @IsString() teamSizeRange?: string;
}

class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

class SsoDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() name?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.registerCompany(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('sso/google')
  googleSso(@Body() dto: SsoDto) {
    return this.auth.ssoLogin('google', dto);
  }

  @Post('sso/microsoft')
  microsoftSso(@Body() dto: SsoDto) {
    return this.auth.ssoLogin('microsoft', dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }
}
