// Firestore セキュリティルールのテスト
// 実行方法：npm run test:rules
// （Firestore エミュレーター＝パソコンの中で動く Firestore の模型 を起動して、その中で確かめる。本番のデータには触らない）
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

const ROOM_ID = 'AbCdEfGhIjKlMnOpQrSt'; // 20文字の英数字（自動IDと同じ形）
const OTHER_ROOM_ID = 'ZzZzZzZzZzZzZzZzZzZz'; // 存在しないルーム

let testEnv;

/** サインイン済みの人の Firestore */
const signedInDb = () => testEnv.authenticatedContext('user-a').firestore();
/** サインインしていない人の Firestore */
const guestDb = () => testEnv.unauthenticatedContext().firestore();

/** 正しい形の家族データ */
const validFamily = (overrides = {}) => ({
  name: '田中家',
  adults: 2,
  students: 1,
  preschoolers: 0,
  infants: 0,
  memo: '',
  collectionCheck: null,
  refundCheck: null,
  createdAt: serverTimestamp(),
  ...overrides,
});

/** 正しい形の支出データ */
const validExpense = (overrides = {}) => ({
  payerFamilyId: 'family-1',
  amount: 3000,
  category: 'food',
  description: 'お肉',
  createdByFamilyId: 'family-1',
  createdAt: serverTimestamp(),
  ...overrides,
});

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-umeniku-bbq',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(async () => {
  await testEnv.cleanup();
});

// 各テストの前に、データを空にしてから「ルーム1つ・家族1つ・品目2つ」を用意する
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const createdAt = Timestamp.now();
    await setDoc(doc(db, 'rooms', ROOM_ID), { name: 'BBQ', rentalPayerFamilyId: null, createdAt });
    await setDoc(doc(db, 'rooms', ROOM_ID, 'families', 'family-1'), validFamily({ createdAt }));
    await setDoc(doc(db, 'rooms', ROOM_ID, 'items', 'chair'), {
      category: 'rental',
      name: '椅子',
      splitType: 'perFamily',
      unitPrice: 300,
      quantities: { 'family-1': 2, 'family-2': 1 },
      createdAt,
    });
    await setDoc(doc(db, 'rooms', ROOM_ID, 'expenses', 'expense-1'), validExpense({ createdAt }));
  });
});

describe('サインインしていない人', () => {
  it('ルームを読めない', async () => {
    await assertFails(getDoc(doc(guestDb(), 'rooms', ROOM_ID)));
  });

  it('家族を読めない', async () => {
    await assertFails(getDocs(collection(guestDb(), 'rooms', ROOM_ID, 'families')));
  });

  it('ルームを作れない', async () => {
    await assertFails(
      setDoc(doc(guestDb(), 'rooms', 'NewRoomNewRoomNewRoom1'), {
        name: 'BBQ',
        rentalPayerFamilyId: null,
        createdAt: serverTimestamp(),
      }),
    );
  });
});

describe('rooms（グループ）', () => {
  it('roomId を知っていれば読める', async () => {
    await assertSucceeds(getDoc(doc(signedInDb(), 'rooms', ROOM_ID)));
  });

  it('一覧取得（list）はできない', async () => {
    await assertFails(getDocs(collection(signedInDb(), 'rooms')));
  });

  it('短すぎる roomId は読めない', async () => {
    await assertFails(getDoc(doc(signedInDb(), 'rooms', 'short')));
  });

  it('正しい形なら作れる', async () => {
    await assertSucceeds(
      setDoc(doc(signedInDb(), 'rooms', 'NewRoomNewRoomNewRoom1'), {
        name: 'BBQ',
        rentalPayerFamilyId: null,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('余分なフィールドがあると作れない', async () => {
    await assertFails(
      setDoc(doc(signedInDb(), 'rooms', 'NewRoomNewRoomNewRoom1'), {
        name: 'BBQ',
        rentalPayerFamilyId: null,
        createdAt: serverTimestamp(),
        isAdmin: true,
      }),
    );
  });

  it('グループ名が空だと作れない', async () => {
    await assertFails(
      setDoc(doc(signedInDb(), 'rooms', 'NewRoomNewRoomNewRoom1'), {
        name: '',
        rentalPayerFamilyId: null,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('レンタル代を支払った家族は変更できる', async () => {
    await assertSucceeds(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID), { rentalPayerFamilyId: 'family-1' }),
    );
  });

  it('グループ名は変更できない', async () => {
    await assertFails(updateDoc(doc(signedInDb(), 'rooms', ROOM_ID), { name: '別の名前' }));
  });

  it('削除できない', async () => {
    await assertFails(deleteDoc(doc(signedInDb(), 'rooms', ROOM_ID)));
  });
});

describe('families（家族）', () => {
  it('ルームの家族一覧を読める', async () => {
    await assertSucceeds(getDocs(collection(signedInDb(), 'rooms', ROOM_ID, 'families')));
  });

  it('存在しないルームの家族は読めない', async () => {
    await assertFails(getDocs(collection(signedInDb(), 'rooms', OTHER_ROOM_ID, 'families')));
  });

  it('ルームをまたいだ横断検索（collectionGroup）はできない', async () => {
    await assertFails(getDocs(collectionGroup(signedInDb(), 'families')));
  });

  it('正しい形なら追加できる', async () => {
    await assertSucceeds(
      setDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'families', 'family-2'), validFamily()),
    );
  });

  it('存在しないルームには追加できない', async () => {
    await assertFails(
      setDoc(doc(signedInDb(), 'rooms', OTHER_ROOM_ID, 'families', 'family-2'), validFamily()),
    );
  });

  it('人数がマイナスだと追加できない', async () => {
    await assertFails(
      setDoc(
        doc(signedInDb(), 'rooms', ROOM_ID, 'families', 'family-2'),
        validFamily({ adults: -1 }),
      ),
    );
  });

  it('人数が小数だと追加できない', async () => {
    await assertFails(
      setDoc(
        doc(signedInDb(), 'rooms', ROOM_ID, 'families', 'family-2'),
        validFamily({ adults: 1.5 }),
      ),
    );
  });

  it('家族名が31文字以上だと追加できない', async () => {
    await assertFails(
      setDoc(
        doc(signedInDb(), 'rooms', ROOM_ID, 'families', 'family-2'),
        validFamily({ name: 'あ'.repeat(31) }),
      ),
    );
  });

  it('集金チェックをつけられる（日時はサーバー時刻）', async () => {
    await assertSucceeds(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'families', 'family-1'), {
        collectionCheck: { amount: 6000, checkedByFamilyId: 'family-1', checkedAt: serverTimestamp() },
      }),
    );
  });

  it('集金チェックの日時をごまかせない', async () => {
    await assertFails(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'families', 'family-1'), {
        collectionCheck: {
          amount: 6000,
          checkedByFamilyId: 'family-1',
          checkedAt: Timestamp.fromDate(new Date('2020-01-01')),
        },
      }),
    );
  });

  it('集金チェックを外せる（記録を消す）', async () => {
    const ref = doc(signedInDb(), 'rooms', ROOM_ID, 'families', 'family-1');
    await updateDoc(ref, {
      collectionCheck: { amount: 6000, checkedByFamilyId: 'family-1', checkedAt: serverTimestamp() },
    });
    await assertSucceeds(updateDoc(ref, { collectionCheck: null }));
  });

  it('チェックの金額がマイナスだと記録できない', async () => {
    await assertFails(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'families', 'family-1'), {
        refundCheck: { amount: -100, checkedByFamilyId: 'family-1', checkedAt: serverTimestamp() },
      }),
    );
  });

  it('削除できる', async () => {
    await assertSucceeds(deleteDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'families', 'family-1')));
  });
});

describe('items（役割分担）', () => {
  it('食材を追加できる（担当未定）', async () => {
    await assertSucceeds(
      setDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'items', 'meat'), {
        category: 'food',
        name: '牛肉',
        assigneeFamilyId: null,
        quantityText: '2kg',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('担当を「未定」に戻せる（家族を削除するとき）', async () => {
    const db = signedInDb();
    await setDoc(doc(db, 'rooms', ROOM_ID, 'items', 'meat'), {
      category: 'food',
      name: '牛肉',
      assigneeFamilyId: 'family-1',
      quantityText: '2kg',
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(
      updateDoc(doc(db, 'rooms', ROOM_ID, 'items', 'meat'), { assigneeFamilyId: null }),
    );
  });

  it('全体で割るレンタル品を追加できる', async () => {
    await assertSucceeds(
      setDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'items', 'grill'), {
        category: 'rental',
        name: '焼き台',
        splitType: 'shared',
        unitPrice: 1500,
        quantity: 2,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('レンタル品の単価がマイナスだと追加できない', async () => {
    await assertFails(
      setDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'items', 'grill'), {
        category: 'rental',
        name: '焼き台',
        splitType: 'shared',
        unitPrice: -100,
        quantity: 2,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('家庭ごとの数量は、自分の家族のキーだけなら更新できる', async () => {
    await assertSucceeds(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'items', 'chair'), {
        'quantities.family-1': 3,
      }),
    );
  });

  it('家庭ごとの数量を、2家族分まとめて書き換えることはできない', async () => {
    await assertFails(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'items', 'chair'), {
        quantities: { 'family-1': 5, 'family-2': 5 },
      }),
    );
  });

  it('家庭ごとのレンタル品は、数量が空の状態で追加できる', async () => {
    await assertSucceeds(
      setDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'items', 'tent'), {
        category: 'rental',
        name: 'テント',
        splitType: 'perFamily',
        unitPrice: 2000,
        quantities: {},
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('家庭ごとのレンタル品の品名と単価は、数量に触れずに編集できる', async () => {
    await assertSucceeds(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'items', 'chair'), {
        name: 'ローチェア',
        unitPrice: 350,
      }),
    );
  });

  it('レンタル品の分け方は変更できない', async () => {
    await assertFails(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'items', 'chair'), {
        splitType: 'shared',
        quantity: 1,
        quantities: null,
      }),
    );
  });
});

describe('expenses（支出）', () => {
  it('正しい形なら登録できる', async () => {
    await assertSucceeds(
      setDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'expenses', 'expense-2'), validExpense()),
    );
  });

  it('金額が0円だと登録できない', async () => {
    await assertFails(
      setDoc(
        doc(signedInDb(), 'rooms', ROOM_ID, 'expenses', 'expense-2'),
        validExpense({ amount: 0 }),
      ),
    );
  });

  it('決められていないカテゴリだと登録できない', async () => {
    await assertFails(
      setDoc(
        doc(signedInDb(), 'rooms', ROOM_ID, 'expenses', 'expense-2'),
        validExpense({ category: 'rental' }),
      ),
    );
  });

  it('金額や内容は編集できる', async () => {
    await assertSucceeds(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'expenses', 'expense-1'), {
        amount: 3500,
        description: 'お肉と野菜',
      }),
    );
  });

  it('登録した家族は変更できない', async () => {
    await assertFails(
      updateDoc(doc(signedInDb(), 'rooms', ROOM_ID, 'expenses', 'expense-1'), {
        createdByFamilyId: 'family-2',
      }),
    );
  });
});
