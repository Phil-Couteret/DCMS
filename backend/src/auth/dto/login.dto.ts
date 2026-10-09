import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  // 'customer': sign in to the center's customer account for this email
  // (the public site), never a staff login with the same email.
  @IsOptional()
  @IsIn(['customer'])
  account?: 'customer';
}
