import {
  CountryOption,
  PaymentMethodOption,
} from '../models/checkout';

export const CHECKOUT_PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  { id: 'card', label: 'Card' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'apple-pay', label: 'Apple Pay' },
];

export const CHECKOUT_COUNTRIES: readonly CountryOption[] = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'CA', label: 'Canada' },
];
