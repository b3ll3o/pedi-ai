import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 5MB.' }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;

    logger.info('upload/image', 'Imagem enviada com sucesso', { filename, size: file.size });

    return NextResponse.json({ url });
  } catch (error) {
    logger.error('upload/image', 'Erro ao fazer upload de imagem', { error });
    return NextResponse.json({ error: 'Erro interno ao processar upload' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
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

    const absolutePath = path.join(UPLOAD_DIR, filename);
    // Verify file is within UPLOAD_DIR
    if (!absolutePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    try {
      const { unlink } = await import('fs/promises');
      await unlink(absolutePath);
      logger.info('upload/image', 'Imagem removida', { filename });
    } catch {
      // File may not exist, that's ok
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('upload/image', 'Erro ao remover imagem', { error });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
