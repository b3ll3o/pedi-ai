/**
 * @spec(RF-ADM-FF-08)
 *
 * Alias de compatibilidade: o spec do analista-qualidade importa
 * `AvaliarFeatureFlagUseCase` (singular), mas a implementação canônica
 * segue convenção plural do módulo (`AvaliarFeatureFlagsUseCase`).
 *
 * Este arquivo re-exporta a classe plural sob o nome singular, mantendo o
 * contrato do teste TDD sem duplicar código.
 */
export { AvaliarFeatureFlagsUseCase as AvaliarFeatureFlagUseCase } from './AvaliarFeatureFlagsUseCase';
