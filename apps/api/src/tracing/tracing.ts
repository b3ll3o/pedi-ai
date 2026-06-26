/**
 * OpenTelemetry tracing bootstrap.
 *
 * **DEVE ser importado ANTES do `AppModule`** no `main.ts` para garantir
 * que auto-instrumentations capturem módulos carregados no bootstrap.
 *
 * Uso:
 * ```ts
 * // main.ts
 * import './tracing/tracing'; // ← PRIMEIRO import!
 * import { NestFactory } from '@nestjs/core';
 * // ...
 * ```
 *
 * Auditoria origem: A2 — sem OTel ponta-a-ponta.
 * Auditoria M13: shutdown via `shutdownOtel()` exportado — **não** mais
 * via `process.once(SIGTERM/SIGINT)`. O hook global conflitava com
 * `enableShutdownHooks()` do Nest (race em graceful shutdown: ambos
 * chamavam `process.exit(0)` em ordem imprevisível, perdendo spans).
 * Agora o NestJS orquestra a ordem: módulos → OTel → exit.
 *
 * Variáveis de ambiente:
 * - `OTEL_EXPORTER_OTLP_ENDPOINT`: URL do collector (ex: http://localhost:4318).
 *   Se ausente, traces ficam apenas em stdout (modo dev).
 * - `OTEL_SERVICE_NAME`: nome do serviço (default: `pedi-ai-api`).
 * - `OTEL_TRACES_ENABLED`: `true` (default) ou `false` para desligar em dev.
 */
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// HIGH-009 (2ª varredura QA): `@opentelemetry/api` nunca exportou `logger`
// — ele expõe `diag` (DiagAPI). Para logs internos do OTel, configuramos
// `diag` com `DiagConsoleLogger` em modo dev ou nível error em produção.
if (process.env.OTEL_DIAG_ENABLED === 'true') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'pedi-ai-api';
const ENABLED = process.env.OTEL_TRACES_ENABLED !== 'false';
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

let sdk: NodeSDK | null = null;

if (ENABLED) {
  try {
    const exporter = OTLP_ENDPOINT
      ? new OTLPTraceExporter({ url: `${OTLP_ENDPOINT}/v1/traces` })
      : // Fallback dev: exportar para stdout via console exporter.
        new ConsoleSpanExporter();

    // Auditoria A-O-05: `SimpleSpanProcessor` exporta cada span imediatamente,
    // saturando o collector em produção (1 span = 1 POST /v1/traces). Em dev
    // mantém SimpleSpanProcessor para feedback imediato no console. Em prod
    // (NODE_ENV=production) usa BatchSpanProcessor com flush a cada 5s.
    const isProd = process.env.NODE_ENV === 'production';
    const spanProcessor = isProd
      ? new BatchSpanProcessor(exporter)
      : new SimpleSpanProcessor(exporter);

    sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
      }),
      spanProcessor,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Desabilitar fs (muito ruído em dev).
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    sdk.start();

    console.log(
      `[OTel] tracing iniciado (service=${SERVICE_NAME}, exporter=${
        OTLP_ENDPOINT ? 'otlp-http' : 'console'
      })`
    );
  } catch (err) {
    // Falha ao iniciar OTel NÃO pode derrubar a API.

    console.error('[OTel] falha ao iniciar tracing:', err);
  }
}

/**
 * Shutdown limpo do OTel SDK. **Não** registra handler próprio de signal
 * (auditoria M13) — em vez disso, é chamado pelo `AppModule.onApplicationShutdown`
 * quando o NestJS orquestra o graceful shutdown. Isso elimina a race
 * entre `process.once(SIGTERM)` do OTel e `enableShutdownHooks()` do Nest.
 */
export async function shutdownOtel(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.shutdown();
  } catch (err) {
    // HIGH-009 (2ª varredura QA): substituído `otelLogger.error` (não
    // existe em `@opentelemetry/api`) por `console.error` — OTel já
    // está desligando, então logger próprio do runtime é suficiente.
    console.error('[OTel] shutdown error:', err);
  }
}
