import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * 入力チェック：空、または空白（スペース）だけの文字はエラーにする。
 * Angular の Validators.required は「スペースだけ」を通してしまうため、こちらを使う。
 */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value !== 'string' || value.trim() === '' ? { blank: true } : null;
}
