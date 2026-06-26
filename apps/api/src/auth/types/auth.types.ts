export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  /**
   * ID do restaurante ao qual o usuário está vinculado nesta sessão.
   * - Para `cliente`: geralmente nulo (acesso por mesa via QR).
   * - Para `dono | gerente | atendente`: obrigatório — vem do perfil ativo.
   */
  restaurantId?: string | null;
}
