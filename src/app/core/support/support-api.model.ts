/** Wire DTOs matching the Support module's backend contracts exactly (camelCase properties,
 * PascalCase enum string values — ASP.NET Core's default System.Text.Json + JsonStringEnumConverter). */

export type TicketStatusApi = 'Open' | 'WaitingCustomer' | 'WaitingAgent' | 'Resolved' | 'Closed';

export type MessageAuthorRoleApi = 'Customer' | 'Agent' | 'System';

export interface TicketCategoryApiDto {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly icon: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly isDefault: boolean;
}

export interface TicketPriorityApiDto {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly level: number;
  readonly slaFirstResponseMinutes: number | null;
  readonly slaResolutionMinutes: number | null;
  readonly isActive: boolean;
  readonly isDefault: boolean;
}

export interface TicketTagApiDto {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface TicketAttachmentApiDto {
  readonly id: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly fileSizeBytes: number;
  readonly publicUrl: string;
  readonly uploadedByUserId: string;
  readonly createdOnUtc: string;
}

export interface TicketMessageApiDto {
  readonly id: string;
  readonly authorUserId: string;
  readonly authorName: string;
  readonly authorRole: MessageAuthorRoleApi;
  readonly body: string;
  readonly isInternal: boolean;
  readonly isDelivered: boolean;
  readonly isRead: boolean;
  readonly createdOnUtc: string;
  readonly attachments: readonly TicketAttachmentApiDto[];
}

export interface TicketSummaryApiDto {
  readonly id: string;
  readonly ticketNumber: string;
  readonly subject: string;
  readonly status: TicketStatusApi;
  readonly category: TicketCategoryApiDto | null;
  readonly priority: TicketPriorityApiDto | null;
  readonly customerUserId: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly assignedAgentUserId: string | null;
  readonly assignedAgentName: string | null;
  readonly lastMessageOnUtc: string | null;
  readonly lastMessageByRole: MessageAuthorRoleApi | null;
  readonly tags: readonly TicketTagApiDto[];
  readonly ratingScore: number | null;
  readonly createdOnUtc: string;
}

export interface TicketStatusHistoryApiDto {
  readonly fromStatus: TicketStatusApi;
  readonly toStatus: TicketStatusApi;
  readonly changedByUserId: string;
  readonly createdOnUtc: string;
}

export interface TicketContextOrderApiDto {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly totalAmount: number;
  readonly status: string;
  readonly createdOnUtc: string;
  readonly productNames: readonly string[];
  readonly hasLicenseKeys: boolean;
}

export interface TicketCustomerContextApiDto {
  readonly customerUserId: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly membershipPlanName: string | null;
  readonly membershipStatus: string | null;
  readonly membershipExpiresOnUtc: string | null;
  readonly recentOrders: readonly TicketContextOrderApiDto[];
  readonly relatedOrderNumber: string | null;
  readonly relatedProductName: string | null;
  readonly customerCountry: string | null;
  readonly customerBrowser: string | null;
  readonly customerDevice: string | null;
  readonly recentTicketsCount: number;
}

export interface TicketDetailApiDto {
  readonly id: string;
  readonly ticketNumber: string;
  readonly subject: string;
  readonly status: TicketStatusApi;
  readonly category: TicketCategoryApiDto | null;
  readonly priority: TicketPriorityApiDto | null;
  readonly assignedAgentUserId: string | null;
  readonly assignedAgentName: string | null;
  readonly messages: readonly TicketMessageApiDto[];
  readonly statusHistory: readonly TicketStatusHistoryApiDto[];
  readonly tags: readonly TicketTagApiDto[];
  readonly context: TicketCustomerContextApiDto;
  readonly ratingScore: number | null;
  readonly ratingComment: string | null;
  readonly mergedIntoTicketId: string | null;
  readonly aiSummary: string | null;
  readonly aiSentiment: string | null;
  readonly createdOnUtc: string;
}

export interface PagedResultApiDto<T> {
  readonly items: readonly T[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;
}

export interface CreateTicketRequestDto {
  readonly subject: string;
  readonly body: string;
  readonly categoryId: string | null;
  readonly priorityId: string | null;
  readonly relatedOrderId: string | null;
  readonly relatedProductId: string | null;
  readonly customerCountry: string | null;
  readonly customerBrowser: string | null;
  readonly customerDevice: string | null;
}

export interface KnowledgeCategoryApiDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
}

export type KnowledgeArticleStatusApi = 'Draft' | 'Published';
export type KnowledgeArticleVisibilityApi = 'Public' | 'Internal';

export interface KnowledgeArticleSummaryApiDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly status: KnowledgeArticleStatusApi;
  readonly visibility: KnowledgeArticleVisibilityApi;
  readonly viewCount: number;
  readonly publishedOnUtc: string | null;
}

export interface KnowledgeArticleDetailApiDto extends KnowledgeArticleSummaryApiDto {
  readonly body: string;
  readonly relatedArticles: readonly KnowledgeArticleSummaryApiDto[];
}

export interface SavedReplyFolderApiDto {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

export interface SavedReplyApiDto {
  readonly id: string;
  readonly folderId: string | null;
  readonly title: string;
  readonly body: string;
  readonly usageCount: number;
}

export interface TicketVolumePointApiDto {
  readonly date: string;
  readonly count: number;
}

export interface AgentWorkloadApiDto {
  readonly agentUserId: string;
  readonly agentName: string;
  readonly openAssignedCount: number;
}

export interface CategoryBreakdownApiDto {
  readonly categoryId: string;
  readonly name: string;
  readonly count: number;
}

export interface PriorityBreakdownApiDto {
  readonly priorityId: string;
  readonly name: string;
  readonly count: number;
}

export interface SupportStatisticsApiDto {
  readonly totalTickets: number;
  readonly openTickets: number;
  readonly waitingCustomerTickets: number;
  readonly waitingAgentTickets: number;
  readonly resolvedTickets: number;
  readonly closedTickets: number;
  readonly ticketsByDay: readonly TicketVolumePointApiDto[];
  readonly averageFirstResponseMinutes: number | null;
  readonly averageResolutionMinutes: number | null;
  readonly agentWorkload: readonly AgentWorkloadApiDto[];
  readonly categoryBreakdown: readonly CategoryBreakdownApiDto[];
  readonly priorityBreakdown: readonly PriorityBreakdownApiDto[];
  readonly averageRating: number | null;
  readonly ratingCount: number;
}
