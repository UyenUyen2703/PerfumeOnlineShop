import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageProduct } from './manage-product';

describe('ManageProduct', () => {
  let component: ManageProduct;
  let fixture: ComponentFixture<ManageProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageProduct]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageProduct);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
