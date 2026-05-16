import { Mesa, MesaProps } from '../entities/Mesa';
import { QRCodePayload } from '../value-objects/QRCodePayload';
import { IQRCodeValidationService } from '../services/QRCodeValidationService';
import { MesaCriadaEvent } from '../events/MesaCriadaEvent';
import { MesaDesativadaEvent } from '../events/MesaDesativadaEvent';
import { IMesaRepository } from '../repositories/IMesaRepository';
import { EventDispatcher } from '@/domain/shared';

export class MesaAggregate {
  private mesa: Mesa;
  private eventDispatcher: EventDispatcher;
  private repository: IMesaRepository;
  private qrCodeValidationService: IQRCodeValidationService;

  constructor(
    mesa: Mesa,
    repository: IMesaRepository,
    eventDispatcher: EventDispatcher,
    qrCodeValidationService: IQRCodeValidationService
  ) {
    this.mesa = mesa;
    this.repository = repository;
    this.eventDispatcher = eventDispatcher ?? EventDispatcher.getInstance();
    this.qrCodeValidationService = qrCodeValidationService;
    this.validarInvariantes();
  }

  get id(): string {
    return this.mesa.id;
  }

  get mesaEntity(): Mesa {
    return this.mesa;
  }

  get label(): string {
    return this.mesa.label;
  }

  get ativo(): boolean {
    return this.mesa.ativo;
  }

  get qrCodePayload(): QRCodePayload {
    return this.mesa.qrCodePayload;
  }

  private validarInvariantes(): void {
    // Invariante: label não pode ser vazio
    if (!this.mesa.label || this.mesa.label.trim().length === 0) {
      throw new Error('Label da mesa não pode ser vazio');
    }

    // Invariante: restauranteId não pode ser vazio
    if (!this.mesa.restauranteId || this.mesa.restauranteId.trim().length === 0) {
      throw new Error('RestauranteId da mesa não pode ser vazio');
    }
  }

  desativar(): void {
    if (!this.mesa.ativo) return;

    this.mesa.desativar();
    this.validarInvariantes();

    const event = new MesaDesativadaEvent(this.mesa);
    this.eventDispatcher.dispatch(event);
  }

  /**
   * Verifica se já existe outra mesa com o mesmo label no restaurante
   */
  private async verificarDuplicidadeLabel(repository: IMesaRepository): Promise<boolean> {
    const mesaExistente = await repository.findByLabel(this.mesa.restauranteId, this.mesa.label);
    return mesaExistente !== null && mesaExistente.id !== this.mesa.id;
  }

  /**
   * Gera o payload do QR code para a mesa usando o serviço de validação
   */
  gerarQRCodePayload(secret: string): QRCodePayload {
    const assinatura = this.qrCodeValidationService.gerarAssinatura(
      this.mesa.restauranteId,
      this.mesa.id,
      secret
    );
    return QRCodePayload.reconstruir({
      restauranteId: this.mesa.restauranteId,
      mesaId: this.mesa.id,
      assinatura,
    });
  }

  static async criar(
    props: Omit<MesaProps, 'criadoEm' | 'atualizadoEm' | 'deletedAt' | 'version'>,
    repository: IMesaRepository,
    eventDispatcher: EventDispatcher,
    secret: string,
    qrCodeValidationService: IQRCodeValidationService
  ): Promise<MesaAggregate> {
    // Gerar QR code payload com assinatura usando o serviço
    const assinatura = qrCodeValidationService.gerarAssinatura(
      props.restauranteId,
      props.id,
      secret
    );
    const qrCodePayload = QRCodePayload.reconstruir({
      restauranteId: props.restauranteId,
      mesaId: props.id,
      assinatura,
    });

    const mesa = Mesa.criar({
      ...props,
      qrCodePayload,
    });

    // Verificar duplicidade de label antes de criar
    const mesaExistente = await repository.findByLabel(props.restauranteId, props.label);
    if (mesaExistente) {
      throw new Error(`Já existe uma mesa com o label "${props.label}" neste restaurante`);
    }

    const aggregate = new MesaAggregate(mesa, repository, eventDispatcher, qrCodeValidationService);

    const event = new MesaCriadaEvent(mesa);
    aggregate.eventDispatcher.dispatch(event);

    return aggregate;
  }

  static async validarDuplicidadeLabel(
    restauranteId: string,
    label: string,
    mesaIdAtual: string | null,
    repository: IMesaRepository
  ): Promise<boolean> {
    const mesaExistente = await repository.findByLabel(restauranteId, label);
    if (!mesaExistente) return false;
    if (mesaIdAtual && mesaExistente.id === mesaIdAtual) return false;
    return true;
  }

  static reconstruir(
    props: MesaProps,
    repository: IMesaRepository,
    eventDispatcher: EventDispatcher,
    qrCodeValidationService: IQRCodeValidationService
  ): MesaAggregate {
    const mesa = new Mesa({ ...props });
    return new MesaAggregate(mesa, repository, eventDispatcher, qrCodeValidationService);
  }
}
