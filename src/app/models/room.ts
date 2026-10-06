import { Timestamp } from '@angular/fire/firestore';

/** グループ（rooms/{roomId}） */
export interface Room {
  id: string;
  name: string;
  /** レンタル代を支払った家族のID。未定なら null */
  rentalPayerFamilyId: string | null;
  createdAt: Timestamp;
}
