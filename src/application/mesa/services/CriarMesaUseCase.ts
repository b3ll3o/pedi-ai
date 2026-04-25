import { UseCase } from '../../shared/types/UseCase';
import { Mesa, IMesaRepository, MesaAggregate, QRCodePayload, IQRCodeValidationService } from '@/domain/mesa';
import { EventDispatcher } from '@/domain/shared';

export interface CriarMesaInput {
  restauranteId: string;
  label: string;
}

export class CriarMesaUseCase implements UseCase<CriarMesaInput, Mesa> {
  constructor(
    private mesaRepo: IMesaRepository,
    private eventDispatcher: EventDispatcher,
    private qrCodeValidationService: IQRCodeValidationService,
    private qrCodeSecret: string = process.env.QR_CODE_SECRET || 'default-secret'
  ) {}

  async execute(input: CriarMesaInput): Promise<Mesa> {
    // Gerar ID único para a mesa
    const id = crypto.randomUUID();

    // Gerar QR code payload usando o serviço de validação
    const assinatura = this.qrCodeValidationService.gerarAssinatura(
      input.restauranteId,
      id,
      this.qrCodeSecret
    );
    const placeholderQrCode = QRCodePayload.reconstruir({
      restauranteId: input.restauranteId,
      mesaId: id,
      assinatura,
    });

    // Criar MesaAggregate com QR code (que inclui validação de label único)
    const mesaAggregate = await MesaAggregate.criar(
      {
        id,
        restauranteId: input.restauranteId,
        label: input.label,
        ativo: true,
        qrCodePayload: placeholderQrCode,
      },
      this.mesaRepo,
      this.eventDispatcher,
      this.qrCodeSecret,
      this.qrCodeValidationService
    );

    // Persistir a mesa
    await this.mesaRepo.create(mesaAggregate.mesaEntity);

    return mesaAggregate.mesaEntity;
  }
}
