import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * DTO de registro. Senha mínima 8 caracteres (consistente com regex de força).
 */
export class RegisterDto {
  @ApiProperty({
    description: 'Email do novo usuário',
    example: 'usuario@exemplo.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @ApiProperty({
    description: 'Senha (mínimo 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial)',
    example: 'S3nh@Forte!',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  password!: string;

  @ApiProperty({ description: 'Nome completo', example: 'Maria Silva', minLength: 2 })
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name!: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Email cadastrado', example: 'usuario@exemplo.com', format: 'email' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @ApiProperty({ description: 'Senha do usuário', example: 'S3nh@Forte!', format: 'password' })
  @IsString()
  password!: string;
}

/**
 * Refresh token agora é **opaco** (não JWT) — string aleatória de 64 chars.
 * O backend valida via hash SHA-256 no banco.
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token opaco (64 caracteres) recebido no login',
    example: 'a'.repeat(64),
    minLength: 64,
  })
  @IsString()
  refresh_token!: string;
}

/**
 * Logout aceita refresh_token opcional — se ausente, logout idempotente.
 */
export class LogoutDto {
  @ApiProperty({
    description: 'Refresh token a ser revogado (opcional — se ausente, logout idempotente)',
    required: false,
  })
  @IsString()
  refresh_token?: string;
}

/**
 * Reset de senha: token opaco (hash armazenado) + nova senha validada.
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de reset recebido por email (opaco)',
    example: 'a'.repeat(64),
  })
  @IsString()
  token!: string;

  @ApiProperty({
    description: 'Nova senha (mesmos requisitos do registro)',
    example: 'N0v@Senh@!',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  newPassword!: string;
}

/**
 * Solicitação de reset — apenas email.
 */
export class RequestResetDto {
  @ApiProperty({
    description: 'Email para o qual enviar o link de recuperação',
    example: 'usuario@exemplo.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;
}
