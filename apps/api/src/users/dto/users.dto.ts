import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';

export class CreateProfileDto {
  @ApiProperty({
    description: 'Email do novo perfil',
    example: 'gerente@exemplo.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ description: 'Nome completo', example: 'João da Silva', minLength: 2 })
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Papel do usuário', enum: UserRole, example: UserRole.gerente })
  @IsEnum(UserRole, { message: 'Papel inválido' })
  role!: UserRole;

  /**
   * restaurantId é injetado pelo controller a partir de `req.user.restaurantId`
   * (NUNCA confiar no input do cliente).
   */
  restaurantId!: string;

  /**
   * Auditoria M18: `userId` é **estritamente proibido** no DTO.
   *
   * O `userId` representa o vínculo com a conta de autenticação
   * (`users.id`). Perfis são criados via convite (sem userId ainda) e
   * aceitos depois. Aceitar `userId` do body permitiria **vinculação
   * arbitrária** de perfil a qualquer conta, possibilitando escalonamento
   * de privilégios (atendente pedindo para virar dono atribuindo o
   * profileId ao userId do dono).
   *
   * `forbidNonWhitelisted: true` no ValidationPipe garante rejeição 400.
   */
}

/**
 * Payload para `PATCH /users/profiles/:id` (admin).
 *
 * Note que `email` e `role` continuam aqui porque um admin pode editar
 * perfis do seu tenant. Mas `PATCH /users/me` usa `UpdateMeDto` (sem email
 * e role) para que um usuário nunca consiga subir o próprio papel via
 * endpoint "self-update".
 */
export class UpdateProfileDto {
  @ApiProperty({ description: 'Nome completo', required: false, minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Email', required: false, format: 'email' })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(255)
  email?: string;

  @ApiProperty({ description: 'Papel', required: false, enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Papel inválido' })
  role?: UserRole;
}

/**
 * Payload para `PATCH /users/me` (próprio usuário).
 *
 * **Apenas nome** — email/role não são editáveis por este endpoint. Email
 * precisa de fluxo de confirmação separado, role é gerenciado por admin.
 * Usar este DTO em vez de `{ name?: string }` ad-hoc fecha o vetor de
 * privilege escalation via `forbidNonWhitelisted` (class-validator precisa
 * de uma classe com metadata; objetos inline não têm).
 */
export class UpdateMeDto {
  @ApiProperty({ description: 'Novo nome do próprio usuário', required: false, minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(255)
  name?: string;
}

export class FindProfilesQueryDto {
  @ApiProperty({ description: 'Filtrar por papel', required: false, enum: UserRole })
  @IsOptional()
  @IsString()
  role?: UserRole;
}
