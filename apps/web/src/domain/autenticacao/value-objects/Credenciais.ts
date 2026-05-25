import { ValueObjectClass } from '@/domain/shared';

export interface CredenciaisValue {
  email: string;
  senha: string;
}

export class Credenciais extends ValueObjectClass<CredenciaisValue> {
  private constructor(props: CredenciaisValue) {
    super(props);
  }

  get email(): string {
    return this.props.email;
  }

  get senha(): string {
    return this.props.senha;
  }

  equals(other: ValueObjectClass<CredenciaisValue>): boolean {
    if (!(other instanceof Credenciais)) return false;
    return this.props.email === other.props.email;
  }

  private static validarEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Email inválido');
    }
  }

  private static validarSenha(senha: string): void {
    if (!senha || senha.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }
  }

  static criar(email: string, senha: string): Credenciais {
    const emailNormalizado = email.trim().toLowerCase();
    this.validarEmail(emailNormalizado);
    this.validarSenha(senha);
    return new Credenciais({ email: emailNormalizado, senha });
  }

  static criarComValidacao(
    email: string,
    senha: string
  ): { success: boolean; credenciais?: Credenciais; erro?: string } {
    const emailNormalizado = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
      return { success: false, erro: 'Email inválido' };
    }
    if (!senha || senha.length < 6) {
      return { success: false, erro: 'Senha deve ter pelo menos 6 caracteres' };
    }
    return {
      success: true,
      credenciais: new Credenciais({ email: emailNormalizado, senha }),
    };
  }
}
