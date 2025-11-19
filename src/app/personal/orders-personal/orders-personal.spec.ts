import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrdersPersonal } from './orders-personal';

describe('OrdersPersonal', () => {
  let component: OrdersPersonal;
  let fixture: ComponentFixture<OrdersPersonal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersPersonal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrdersPersonal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
