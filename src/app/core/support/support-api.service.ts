import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SUPPORT_API } from '../api/api-endpoints';
import { ApiClientService } from '../api/api-client.service';
import {
  AgentWorkloadApiDto,
  KnowledgeArticleDetailApiDto,
  KnowledgeArticleSummaryApiDto,
  KnowledgeCategoryApiDto,
  PagedResultApiDto,
  SavedReplyApiDto,
  SavedReplyFolderApiDto,
  SupportStatisticsApiDto,
  TicketAttachmentApiDto,
  TicketCategoryApiDto,
  TicketDetailApiDto,
  TicketMessageApiDto,
  TicketPriorityApiDto,
  TicketStatusApi,
  TicketSummaryApiDto,
  TicketTagApiDto,
} from './support-api.model';

export interface TicketListParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly status?: TicketStatusApi;
  readonly categoryId?: string;
  readonly priorityId?: string;
  readonly assignedAgentUserId?: string;
  readonly tagId?: string;
  readonly unassigned?: boolean;
  readonly sortBy?: string;
  readonly sortDescending?: boolean;
}

function toHttpParams(params: object): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value as string | number | boolean;
    }
  }
  return result;
}

/** Raw HTTP calls for the Support module — components/pages should go through a facade, never this
 * service directly (the established raw-service/facade split, e.g. CartService vs CartFacade). */
@Injectable({ providedIn: 'root' })
export class SupportApiService {
  private readonly api = inject(ApiClientService);

  // Customer-facing tickets
  getMyTickets(params: TicketListParams): Observable<PagedResultApiDto<TicketSummaryApiDto>> {
    return this.api.get(SUPPORT_API.tickets, { params: toHttpParams(params) });
  }

  getMyTicket(id: string): Observable<TicketDetailApiDto> {
    return this.api.get(SUPPORT_API.ticket(id));
  }

  createTicket(body: unknown): Observable<TicketDetailApiDto> {
    return this.api.post(SUPPORT_API.tickets, body);
  }

  reply(id: string, body: unknown): Observable<TicketMessageApiDto> {
    return this.api.post(SUPPORT_API.ticketMessages(id), body);
  }

  closeTicket(id: string): Observable<void> {
    return this.api.post(SUPPORT_API.ticketClose(id));
  }

  reopenTicket(id: string): Observable<void> {
    return this.api.post(SUPPORT_API.ticketReopen(id));
  }

  rateTicket(id: string, score: number, comment: string | null): Observable<void> {
    return this.api.post(SUPPORT_API.ticketRate(id), { score, comment });
  }

  uploadAttachment(id: string, file: File): Observable<TicketAttachmentApiDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post(SUPPORT_API.ticketAttachments(id), formData);
  }

  // Admin/agent tickets
  getTickets(params: TicketListParams): Observable<PagedResultApiDto<TicketSummaryApiDto>> {
    return this.api.get(SUPPORT_API.adminTickets, { params: toHttpParams(params) });
  }

  getTicket(id: string): Observable<TicketDetailApiDto> {
    return this.api.get(SUPPORT_API.adminTicket(id));
  }

  createTicketAsAgent(body: unknown): Observable<TicketDetailApiDto> {
    return this.api.post(SUPPORT_API.adminTickets, body);
  }

  replyAsAgent(id: string, body: unknown): Observable<TicketMessageApiDto> {
    return this.api.post(SUPPORT_API.adminTicketMessages(id), body);
  }

  assignTicket(id: string, agentUserId: string): Observable<void> {
    return this.api.post(SUPPORT_API.adminTicketAssign(id), { agentUserId });
  }

  changeStatus(id: string, status: TicketStatusApi): Observable<void> {
    return this.api.post(SUPPORT_API.adminTicketStatus(id), { status });
  }

  changePriority(id: string, priorityId: string | null): Observable<void> {
    return this.api.post(SUPPORT_API.adminTicketPriority(id), { priorityId });
  }

  closeTicketAsAgent(id: string): Observable<void> {
    return this.api.post(SUPPORT_API.adminTicketClose(id));
  }

  reopenTicketAsAgent(id: string): Observable<void> {
    return this.api.post(SUPPORT_API.adminTicketReopen(id));
  }

  mergeTicket(id: string, targetTicketId: string): Observable<void> {
    return this.api.post(SUPPORT_API.adminTicketMerge(id), { targetTicketId });
  }

  deleteTicket(id: string): Observable<void> {
    return this.api.delete(SUPPORT_API.adminTicket(id));
  }

  uploadAttachmentAsAgent(id: string, file: File): Observable<TicketAttachmentApiDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post(SUPPORT_API.adminTicketAttachments(id), formData);
  }

  addTag(ticketId: string, tagId: string): Observable<void> {
    return this.api.post(SUPPORT_API.adminTicketTag(ticketId, tagId));
  }

  removeTag(ticketId: string, tagId: string): Observable<void> {
    return this.api.delete(SUPPORT_API.adminTicketTag(ticketId, tagId));
  }

  // Lookups
  getCategories(): Observable<readonly TicketCategoryApiDto[]> {
    return this.api.get(SUPPORT_API.categories);
  }

  getPriorities(): Observable<readonly TicketPriorityApiDto[]> {
    return this.api.get(SUPPORT_API.priorities);
  }

  getTags(): Observable<readonly TicketTagApiDto[]> {
    return this.api.get(SUPPORT_API.tags);
  }

  createCategory(body: unknown): Observable<TicketCategoryApiDto> {
    return this.api.post(SUPPORT_API.adminCategories, body);
  }

  updateCategory(id: string, body: unknown): Observable<void> {
    return this.api.put(SUPPORT_API.adminCategory(id), body);
  }

  deleteCategory(id: string): Observable<void> {
    return this.api.delete(SUPPORT_API.adminCategory(id));
  }

  createPriority(body: unknown): Observable<TicketPriorityApiDto> {
    return this.api.post(SUPPORT_API.adminPriorities, body);
  }

  updatePriority(id: string, body: unknown): Observable<void> {
    return this.api.put(SUPPORT_API.adminPriority(id), body);
  }

  deletePriority(id: string): Observable<void> {
    return this.api.delete(SUPPORT_API.adminPriority(id));
  }

  createTag(body: unknown): Observable<TicketTagApiDto> {
    return this.api.post(SUPPORT_API.adminTags, body);
  }

  updateTag(id: string, body: unknown): Observable<void> {
    return this.api.put(SUPPORT_API.adminTag(id), body);
  }

  deleteTag(id: string): Observable<void> {
    return this.api.delete(SUPPORT_API.adminTag(id));
  }

  // Knowledge base
  getPublicKbCategories(): Observable<readonly KnowledgeCategoryApiDto[]> {
    return this.api.get(SUPPORT_API.kbCategories);
  }

  getPublicKbArticles(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
  }): Observable<PagedResultApiDto<KnowledgeArticleSummaryApiDto>> {
    return this.api.get(SUPPORT_API.kbArticles, { params: toHttpParams(params) });
  }

  getPublicKbArticle(id: string): Observable<KnowledgeArticleDetailApiDto> {
    return this.api.get(SUPPORT_API.kbArticle(id));
  }

  getAdminKbArticles(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
    status?: string;
  }): Observable<PagedResultApiDto<KnowledgeArticleSummaryApiDto>> {
    return this.api.get(SUPPORT_API.adminKbArticles, { params: toHttpParams(params) });
  }

  getAdminKbArticle(id: string): Observable<KnowledgeArticleDetailApiDto> {
    return this.api.get(SUPPORT_API.adminKbArticle(id));
  }

  createKbArticle(body: unknown): Observable<KnowledgeArticleDetailApiDto> {
    return this.api.post(SUPPORT_API.adminKbArticles, body);
  }

  updateKbArticle(id: string, body: unknown): Observable<void> {
    return this.api.put(SUPPORT_API.adminKbArticle(id), body);
  }

  deleteKbArticle(id: string): Observable<void> {
    return this.api.delete(SUPPORT_API.adminKbArticle(id));
  }

  publishKbArticle(id: string): Observable<void> {
    return this.api.post(SUPPORT_API.adminKbArticlePublish(id));
  }

  unpublishKbArticle(id: string): Observable<void> {
    return this.api.post(SUPPORT_API.adminKbArticleUnpublish(id));
  }

  createKbCategory(body: unknown): Observable<KnowledgeCategoryApiDto> {
    return this.api.post(SUPPORT_API.adminKbCategories, body);
  }

  updateKbCategory(id: string, body: unknown): Observable<void> {
    return this.api.put(SUPPORT_API.adminKbCategory(id), body);
  }

  deleteKbCategory(id: string): Observable<void> {
    return this.api.delete(SUPPORT_API.adminKbCategory(id));
  }

  // Saved replies
  getSavedReplies(folderId?: string, search?: string): Observable<readonly SavedReplyApiDto[]> {
    return this.api.get(SUPPORT_API.savedReplies, { params: toHttpParams({ folderId, search }) });
  }

  getSavedReplyFolders(): Observable<readonly SavedReplyFolderApiDto[]> {
    return this.api.get(SUPPORT_API.savedReplyFolders);
  }

  renderSavedReply(id: string, ticketId: string): Observable<string> {
    return this.api.post(SUPPORT_API.savedReplyRender(id, ticketId));
  }

  createSavedReply(body: unknown): Observable<SavedReplyApiDto> {
    return this.api.post(SUPPORT_API.adminSavedReplies, body);
  }

  updateSavedReply(id: string, body: unknown): Observable<void> {
    return this.api.put(SUPPORT_API.adminSavedReply(id), body);
  }

  deleteSavedReply(id: string): Observable<void> {
    return this.api.delete(SUPPORT_API.adminSavedReply(id));
  }

  createSavedReplyFolder(body: unknown): Observable<SavedReplyFolderApiDto> {
    return this.api.post(SUPPORT_API.adminSavedReplyFolders, body);
  }

  updateSavedReplyFolder(id: string, body: unknown): Observable<void> {
    return this.api.put(SUPPORT_API.adminSavedReplyFolder(id), body);
  }

  deleteSavedReplyFolder(id: string): Observable<void> {
    return this.api.delete(SUPPORT_API.adminSavedReplyFolder(id));
  }

  // Analytics
  getStatistics(dateFrom?: string, dateTo?: string): Observable<SupportStatisticsApiDto> {
    return this.api.get(SUPPORT_API.analytics, { params: toHttpParams({ dateFrom, dateTo }) });
  }
}
