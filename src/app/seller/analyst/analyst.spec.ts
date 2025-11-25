import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Analyst } from './analyst';

describe('Analyst', () => {
  let component: Analyst;
  let fixture: ComponentFixture<Analyst>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analyst]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Analyst);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
