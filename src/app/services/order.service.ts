export class OrderService {
  orderProduct(productId: number, quantity: number): void {
    console.log(`Ordering ${quantity} of product ID: ${productId}`);
  }
}
