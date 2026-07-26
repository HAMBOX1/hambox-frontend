export type FlowKey = 'find' | 'track' | 'compare' | 'activate' | 'refund' | 'support';

export type MessageRole = 'user' | 'ai';

export interface QuickAction {
  readonly label: string;
  readonly icon: string;
  readonly primary?: boolean;
}

export interface ProductCardData {
  readonly name: string;
  readonly price: string;
  readonly oldPrice?: string;
  readonly discountPercent?: number;
  readonly rating: number;
  readonly reviews: string;
  readonly stock: string;
}

export interface OrderStep {
  readonly label: string;
  readonly done: boolean;
}

export interface OrderCardData {
  readonly number: string;
  readonly date: string;
  readonly status: string;
  readonly steps: readonly OrderStep[];
}

export interface LicenseCardData {
  readonly product: string;
  readonly key: string;
  readonly activated: boolean;
}

export type AssistantCard =
  | { readonly type: 'product'; readonly data: ProductCardData }
  | { readonly type: 'order'; readonly data: OrderCardData }
  | { readonly type: 'license'; readonly data: LicenseCardData };

export interface AssistantMessage {
  readonly id: string;
  readonly role: MessageRole;
  content: string;
  readonly time: string;
  readonly flow?: FlowKey;
  cards?: readonly AssistantCard[];
  actions?: readonly QuickAction[];
  streaming?: boolean;
  error?: boolean;
  liked?: boolean;
  disliked?: boolean;
}

export interface SuggestionChip {
  readonly label: string;
  readonly icon: string;
  readonly flow: FlowKey;
}

export type HistoryGroup = 'Today' | 'Yesterday' | 'Last 7 Days' | 'Last Month';

export interface HistoryItem {
  readonly id: string;
  readonly group: HistoryGroup;
  title: string;
  readonly time: string;
  readonly flow: FlowKey;
  pinned?: boolean;
}

export interface ConversationFlow {
  readonly userText: string;
  readonly reply: string;
  readonly followup?: string;
  readonly cards?: readonly AssistantCard[];
  readonly actions?: readonly QuickAction[];
  readonly retryNote: string;
}
