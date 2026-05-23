import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface RespostaSucesso<T> {
  success: true;
  data: T;
  timestamp: string;
}

@Injectable()
export class RespostaSucessoInterceptor<T> implements NestInterceptor<T, RespostaSucesso<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<RespostaSucesso<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }))
    );
  }
}
