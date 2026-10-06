import { Timestamp } from '@angular/fire/firestore';
import { ExpenseCategory } from '../constants';

/** 支出（rooms/{roomId}/expenses/{expenseId}） */
export interface Expense {
  id: string;
  /** 立て替えた家族のID */
  payerFamilyId: string;
  /** 金額（円） */
  amount: number;
  category: ExpenseCategory;
  /** 内容（例：お肉） */
  description: string;
  /** 登録した家族のID（自動で記録） */
  createdByFamilyId: string;
  createdAt: Timestamp;
}
