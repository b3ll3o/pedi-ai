import { EntityClass } from '@/domain/shared';

export interface RestauranteProps {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string | null;
  logoUrl: string | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export class Restaurante extends EntityClass<RestauranteProps> {
  get nome(): string {
    return this.props.nome;
  }

  get cnpj(): string {
    return this.props.cnpj;
  }

  get endereco(): string {
    return this.props.endereco;
  }

  get telefone(): string | null {
    return this.props.telefone;
  }

  get logoUrl(): string | null {
    return this.props.logoUrl;
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  get criadoEm(): Date {
    return this.props.criadoEm;
  }

  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }

  equals(other: EntityClass<RestauranteProps>): boolean {
    if (!(other instanceof Restaurante)) return false;
    return this.id === other.id;
  }

  atualizarNome(novoNome: string): void {
    Object.assign(this.props, { nome: novoNome, atualizadoEm: new Date() });
  }

  atualizarEndereco(novoEndereco: string): void {
    Object.assign(this.props, { endereco: novoEndereco, atualizadoEm: new Date() });
  }

  atualizarTelefone(novoTelefone: string | null): void {
    Object.assign(this.props, { telefone: novoTelefone, atualizadoEm: new Date() });
  }

  atualizarLogo(novaLogoUrl: string | null): void {
    Object.assign(this.props, { logoUrl: novaLogoUrl, atualizadoEm: new Date() });
  }

  ativar(): void {
    Object.assign(this.props, { ativo: true, atualizadoEm: new Date() });
  }

  desativar(): void {
    Object.assign(this.props, { ativo: false, atualizadoEm: new Date() });
  }

  static criar(props: Omit<RestauranteProps, 'id' | 'criadoEm' | 'atualizadoEm'>): Restaurante {
    const now = new Date();
    return new Restaurante({
      ...props,
      id: crypto.randomUUID(),
      criadoEm: now,
      atualizadoEm: now,
    } as RestauranteProps);
  }

  static reconstruir(props: RestauranteProps): Restaurante {
    return new Restaurante(props);
  }
}
