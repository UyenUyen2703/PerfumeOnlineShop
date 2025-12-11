import { TestBed } from '@angular/core/testing';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  let service: WishlistService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WishlistService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get wishlist count', () => {
    const count = service.getWishlistCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should get wishlist', () => {
    const wishlist = service.getWishlist();
    expect(Array.isArray(wishlist)).toBe(true);
  });

  it('should check if item is in wishlist', () => {
    const productId = 'test-product-id';
    const isInWishlist = service.isInWishlist(productId);
    expect(typeof isInWishlist).toBe('boolean');
  });
});
