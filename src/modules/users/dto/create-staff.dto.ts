import { IsEmail, IsEnum, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';
import { UserRole } from '../user.entity';

/** `POST /api/staff/users` — admin creating a staff or admin account. */
export class CreateStaffDto {
  @IsString() @Length(2, 120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional() @IsString() @Matches(/^[0-9+\-\s]{6,20}$/, { message: 'เบอร์โทรไม่ถูกต้อง' })
  phone?: string;

  @IsString() @MinLength(8, { message: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' })
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
