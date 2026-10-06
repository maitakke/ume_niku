import { Pipe, PipeTransform } from '@angular/core';

/**
 * 金額を「¥6,000」の形で表示する。
 * 使い方：{{ 6000 | yen }}
 */
@Pipe({ name: 'yen' })
export class YenPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
  }
}
