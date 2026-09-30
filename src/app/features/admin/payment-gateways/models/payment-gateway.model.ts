export interface PaymentGatewayListItemDto {
  readonly gatewayKey: string;
  readonly displayName: string;
  readonly isEnabled: boolean;
  readonly isTestMode: boolean;
  readonly hasApiKey: boolean;
  readonly hasApiSecret: boolean;
}

export interface PaymentGatewayDetailDto {
  readonly gatewayKey: string;
  readonly displayName: string;
  readonly isEnabled: boolean;
  readonly isTestMode: boolean;
  readonly feePercent: number | null;
  readonly baseUrl: string | null;
  readonly accountId: string | null;
  readonly secondaryId: string | null;
  readonly hasApiKey: boolean;
  readonly hasApiSecret: boolean;
  readonly webhookUrl: string | null;
  readonly frontendResultUrl: string | null;
  readonly additionalConfigJson: string | null;
  readonly modifiedOnUtc: string;
}

export interface UpdatePaymentGatewayGeneralRequest {
  displayName: string;
  isTestMode: boolean;
  feePercent: number | null;
  baseUrl: string | null;
  accountId: string | null;
  webhookUrl: string | null;
  frontendResultUrl: string | null;
  additionalConfigJson: string | null;
}

/** A blank field here means "leave the stored value alone" — never "clear it". */
export interface UpdatePaymentGatewayCredentialsRequest {
  apiKey: string | null;
  apiSecret: string | null;
  secondaryId: string | null;
}

export interface PaymentGatewayTestConnectionResultDto {
  readonly isSuccess: boolean;
  readonly message: string;
}
