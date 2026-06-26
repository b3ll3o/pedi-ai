import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Rate limit em memória: 10 uploads por usuário autenticado, janela
 * deslizante de 60s. Sem dependência externa (Redis/Upstash). Suficiente
 * para defesa contra abuso casual — em produção multi-instância, mover
 * para Redis (shared state).
 *
 * Memória: mapa `userId → timestamps[]`. Limpamos entries expiradas a
 * cada chamada para não crescer indefinidamente.
 */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const existing = rateLimitMap.get(userId) ?? [];
  // Filtra timestamps dentro da janela atual
  const recent = existing.filter((ts) => ts > cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(userId, recent);
    return false;
  }
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

/**
 * Valida magic bytes do buffer. `file.type` no FormData é client-controlled
 * (atacante pode mandar `Content-Type: image/jpeg` com payload `.exe`).
 * Lemos os primeiros bytes para confirmar que é realmente uma imagem.
 *
 * Retorna o tipo MIME detectado ou `null` se não for imagem reconhecida.
 */
function detectImageType(buffer: Buffer): string | null {
  // Cada entry: [mime, prefix bytes...] — comparação é byte-a-byte
  // contra o início do buffer. Ordem importa: JPEG e WebP têm prefixos
  // que não conflitam, mas PNG/GIF têm primeiros bytes únicos.
  const signatures: Array<[string, number[]]> = [
    ['image/jpeg', [0xff, 0xd8, 0xff]],
    ['image/png', [0x89, 0x50, 0x4e, 0x47]],
    ['image/gif', [0x47, 0x49, 0x46, 0x38]],
  ];

  for (const [mime, sig] of signatures) {
    if (matchesPrefix(buffer, sig)) return mime;
  }

  // WebP tem magic em duas posições (RIFF no início + WEBP no offset 8).
  // Separado para não inflar a tabela.
  if (
    matchesPrefix(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    matchesPrefixAt(buffer, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return 'image/webp';
  }

  return null;
}

function matchesPrefix(buffer: Buffer, sig: number[]): boolean {
  return sig.every((byte, i) => buffer[i] === byte);
}

function matchesPrefixAt(buffer: Buffer, offset: number, sig: number[]): boolean {
  return sig.every((byte, i) => buffer[offset + i] === byte);
}

export async function POST(request: NextRequest) {
  try {
    // Auth obrigatório — sem sessão válida, rejeita imediatamente.
    // Antes do fix S3#1, qualquer cliente (inclusive anônimo) podia
    // fazer upload e o arquivo virava público em /uploads/<file>.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: 'Limite de uploads excedido. Tente novamente em 1 minuto.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Defesa em duas camadas: tipo declarado + magic bytes. O tipo do
    // header é client-controlled; magic bytes são a verdade.
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.' },
        { status: 400 }
      );
    }

    // Lemos o buffer inteiro para detectar magic bytes e validar tamanho
    // (file.size no client pode mentir; arrayBuffer é autoritativo).
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 5MB.' }, { status: 400 });
    }

    const detectedType = detectImageType(buffer);
    if (!detectedType) {
      // Magic bytes não batem — cliente mentiu sobre o tipo OU enviou
      // binário arbitrário. Rejeita sem revelar detalhes.
      return NextResponse.json(
        { error: 'Conteúdo do arquivo não corresponde a uma imagem válida.' },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename — extensão baseada no TIPO DETECTADO,
    // não no `file.name` (que pode ser "shell.exe.jpg").
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    const ext = extMap[detectedType] ?? 'jpg';
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Defense-in-depth: garante que `filePath` está dentro de UPLOAD_DIR.
    // Como `filename` é construído por nós com caracteres seguros, isso
    // é redundante — mas mantém o invariante caso a lógica mude no futuro.
    const resolved = path.resolve(filePath);
    const resolvedDir = path.resolve(UPLOAD_DIR);
    if (!resolved.startsWith(resolvedDir + path.sep)) {
      return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 });
    }

    await writeFile(resolved, buffer);

    const url = `/uploads/${filename}`;

    logger.info('upload/image', 'Imagem enviada com sucesso', {
      userId: session.user.id,
      filename,
      size: buffer.byteLength,
      detectedType,
    });

    return NextResponse.json({ url });
  } catch (error) {
    logger.error('upload/image', 'Erro ao fazer upload de imagem', { error });
    return NextResponse.json({ error: 'Erro interno ao processar upload' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL da imagem é obrigatória' }, { status: 400 });
    }

    // Extract filename from URL
    const filename = imageUrl.replace('/uploads/', '');

    // Security: prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    const absolutePath = path.resolve(path.join(UPLOAD_DIR, filename));
    const resolvedDir = path.resolve(UPLOAD_DIR);
    // Verify file is within UPLOAD_DIR (canonical path check)
    if (!absolutePath.startsWith(resolvedDir + path.sep)) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    try {
      const { unlink } = await import('fs/promises');
      await unlink(absolutePath);
      logger.info('upload/image', 'Imagem removida', { filename, userId: session.user.id });
    } catch {
      // File may not exist, that's ok
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('upload/image', 'Erro ao remover imagem', { error });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
