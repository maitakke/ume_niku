import { Timestamp } from '@angular/fire/firestore';

/** 集金・返金チェックの記録 */
export interface CheckRecord {
  /** チェックした時点の金額（円） */
  amount: number;
  /** チェックした家族のID */
  checkedByFamilyId: string;
  /** チェックした日時 */
  checkedAt: Timestamp;
}

/** 参加家族（rooms/{roomId}/families/{familyId}） */
export interface Family {
  id: string;
  name: string;
  /** 大人の人数 */
  adults: number;
  /** 小中学生の人数 */
  students: number;
  /** 幼児の人数 */
  preschoolers: number;
  /** 乳児の人数 */
  infants: number;
  memo: string;
  /** 集金チェック。null なら未チェック */
  collectionCheck: CheckRecord | null;
  /** 返金チェック。null なら未チェック */
  refundCheck: CheckRecord | null;
  createdAt: Timestamp;
}
