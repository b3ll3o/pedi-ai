import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO de registro.
 *
 * Política de senha alinhada com NIST SP 800-63B §5.1.1.2: apenas limites de
 * comprimento (8–128), **sem regras de composição** (maiúscula/número/especial).
 *
 * @see https://pages.nist.gov/800-63-3/sp800-63b.html#memsecret
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
    description:
      'Senha (mínimo 8 caracteres, máximo 128, sem regras de composição — NIST 800-63B §5.1.1.2)',
    example: 'cafe com pao de queijo em 2026',
    minLength: 8,
    maxLength: 128,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @MaxLength(128, { message: 'A senha deve ter no máximo 128 caracteres' })
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

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'cafe com pao de queijo em 2026',
    format: 'password',
  })
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
    description:
      'Nova senha (mínimo 8 caracteres, máximo 128, sem regras de composição — NIST 800-63B §5.1.1.2)',
    example: 'cafe com pao de queijo em 2026',
    minLength: 8,
    maxLength: 128,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @MaxLength(128, { message: 'A senha deve ter no máximo 128 caracteres' })
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
