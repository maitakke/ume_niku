import { TestBed } from '@angular/core/testing';
import { CurrentFamilyService } from './current-family.service';

describe('CurrentFamilyService', () => {
  let service: CurrentFamilyService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(CurrentFamilyService);
  });

  it('まだ選んでいなければ null を返す', () => {
    expect(service.get('room-1')).toBeNull();
  });

  it('選んだ家族を記憶する', () => {
    service.set('room-1', 'family-a');
    expect(service.get('room-1')).toBe('family-a');
  });

  it('グループごとに別々に記憶する', () => {
    service.set('room-1', 'family-a');
    service.set('room-2', 'family-b');
    expect(service.get('room-1')).toBe('family-a');
    expect(service.get('room-2')).toBe('family-b');
  });
});
