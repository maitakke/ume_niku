import { FormControl } from '@angular/forms';
import { notBlank } from './validators';

describe('notBlank（空白だけの入力をエラーにする）', () => {
  it('文字が入っていればOK', () => {
    expect(notBlank(new FormControl('田中家'))).toBeNull();
  });

  it('空ならエラー', () => {
    expect(notBlank(new FormControl(''))).toEqual({ blank: true });
  });

  it('スペースだけならエラー（全角スペースも）', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ blank: true });
    expect(notBlank(new FormControl('　'))).toEqual({ blank: true });
  });
});
