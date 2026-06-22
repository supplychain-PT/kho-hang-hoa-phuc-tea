import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@phuctea.vn', description: 'Email hoặc tên đăng nhập (vd: vanphuochuynh.ccn)' })
  @IsString({ message: 'Tên đăng nhập không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'Admin@123456' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
