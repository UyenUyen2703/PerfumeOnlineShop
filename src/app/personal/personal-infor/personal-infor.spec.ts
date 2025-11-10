import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonalInfor } from './personal-infor';

describe('PersonalInfor', () => {
  let component: PersonalInfor;
  let fixture: ComponentFixture<PersonalInfor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalInfor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonalInfor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
