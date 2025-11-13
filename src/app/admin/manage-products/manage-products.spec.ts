import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageProducts } from './manage-products';

describe('ManageProducts', () => {
  let component: ManageProducts;
  let fixture: ComponentFixture<ManageProducts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageProducts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageProducts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
