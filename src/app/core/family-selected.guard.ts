import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CurrentFamilyService } from './current-family.service';

/**
 * グループ内のタブを開く前のチェック。
 * この端末でまだ家族を選んでいなければ「どの家族ですか？」画面へ移動させる。
 */
export const familySelectedGuard: CanActivateFn = (route) => {
  const roomId = route.paramMap.get('roomId') ?? '';
  if (inject(CurrentFamilyService).get(roomId)) {
    return true;
  }
  return inject(Router).createUrlTree(['/r', roomId, 'select-family']);
};
