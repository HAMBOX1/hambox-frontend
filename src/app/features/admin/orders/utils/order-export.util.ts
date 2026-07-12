import { AdminOrderListItemDto } from '../models/order-api.model';

function escapeCsv(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function exportOrdersToCsv(orders: readonly AdminOrderListItemDto[], filename = 'orders.csv'): void {
  const headers = [
    'Order Number',
    'Customer',
    'Email',
    'Items',
    'Products',
    'Total',
    'Payment Method',
    'Payment Status',
    'Order Status',
    'Delivery Status',
    'Membership Discount',
    'Coupon',
    'Purchase Date',
  ];

  const rows = orders.map((order) =>
    [
      order.orderNumber,
      order.customerName,
      order.email,
      order.itemsCount,
      order.productsSummary,
      order.orderTotal,
      order.paymentMethod,
      order.paymentStatus,
      order.orderStatus,
      order.deliveryStatus,
      order.membershipDiscount,
      order.couponCode ?? '',
      order.purchaseDate,
    ]
      .map(escapeCsv)
      .join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');
  downloadTextFile(csv, filename, 'text/csv;charset=utf-8;');
}

export function exportOrdersToExcel(orders: readonly AdminOrderListItemDto[], filename = 'orders.xls'): void {
  const tableRows = orders
    .map(
      (order) => `<tr>
        <td>${order.orderNumber}</td>
        <td>${order.customerName}</td>
        <td>${order.email}</td>
        <td>${order.itemsCount}</td>
        <td>${order.productsSummary}</td>
        <td>${order.orderTotal}</td>
        <td>${order.paymentMethod}</td>
        <td>${order.paymentStatus}</td>
        <td>${order.orderStatus}</td>
        <td>${order.deliveryStatus}</td>
        <td>${order.membershipDiscount}</td>
        <td>${order.couponCode ?? ''}</td>
        <td>${order.purchaseDate}</td>
      </tr>`,
    )
    .join('');

  const html = `<table><thead><tr>
    <th>Order Number</th><th>Customer</th><th>Email</th><th>Items</th><th>Products</th>
    <th>Total</th><th>Payment Method</th><th>Payment Status</th><th>Order Status</th>
    <th>Delivery Status</th><th>Membership Discount</th><th>Coupon</th><th>Purchase Date</th>
  </tr></thead><tbody>${tableRows}</tbody></table>`;

  downloadTextFile(html, filename, 'application/vnd.ms-excel');
}

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
