import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ACCOUNT_API, AUTH_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { PagedResult } from '../../catalog/models/category.model';
import {
  AccountDashboardApiDto,
  ChangePasswordRequest,
  CreateReviewRequest,
  CustomerLibraryItemApiDto,
  CustomerLibraryQuery,
  RevealCustomerLibraryKeyApiDto,
  OrderDetailApiDto,
  OrderSummaryApiDto,
  ProductReviewApiDto,
  ReferralDashboardApiDto,
  ReferralHistoryApiDto,
  UpdateProfileRequest,
  UpdateReviewRequest,
  UserNotificationApiDto,
  UserProfileApiDto,
  WishlistItemApiDto,
} from '../models/account-api.model';

@Injectable({
  providedIn: 'root',
})
export class AccountApiService {
  private readonly api = inject(ApiClientService);

  getProfile(): Observable<UserProfileApiDto> {
    return this.api.get<UserProfileApiDto>(AUTH_API.me);
  }

  updateProfile(request: UpdateProfileRequest): Observable<UserProfileApiDto> {
    return this.api.patch<UserProfileApiDto>(AUTH_API.me, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.api.post<void>(AUTH_API.changePassword, request);
  }

  getDashboard(): Observable<AccountDashboardApiDto> {
    return this.api.get<AccountDashboardApiDto>(ACCOUNT_API.dashboard);
  }

  getWishlist(): Observable<readonly WishlistItemApiDto[]> {
    return this.api.get<readonly WishlistItemApiDto[]>(ACCOUNT_API.wishlist);
  }

  addWishlistItem(productId: string): Observable<WishlistItemApiDto> {
    return this.api.post<WishlistItemApiDto>(ACCOUNT_API.wishlist, { productId });
  }

  removeWishlistItem(productId: string): Observable<void> {
    return this.api.delete<void>(ACCOUNT_API.wishlistItem(productId));
  }

  moveWishlistToCart(productId: string): Observable<unknown> {
    return this.api.post(ACCOUNT_API.moveWishlistToCart(productId), {});
  }

  getOrders(pageNumber = 1, pageSize = 10): Observable<PagedResult<OrderSummaryApiDto>> {
    return this.api.get<PagedResult<OrderSummaryApiDto>>(ACCOUNT_API.orders, {
      params: { pageNumber, pageSize },
    });
  }

  getOrder(orderId: string): Observable<OrderDetailApiDto> {
    return this.api.get<OrderDetailApiDto>(ACCOUNT_API.order(orderId));
  }

  getProductReviews(productId: string): Observable<readonly ProductReviewApiDto[]> {
    return this.api.get<readonly ProductReviewApiDto[]>(ACCOUNT_API.productReviews(productId));
  }

  getMyReviews(): Observable<readonly ProductReviewApiDto[]> {
    return this.api.get<readonly ProductReviewApiDto[]>(ACCOUNT_API.myReviews);
  }

  createReview(request: CreateReviewRequest): Observable<ProductReviewApiDto> {
    return this.api.post<ProductReviewApiDto>(ACCOUNT_API.reviews, request);
  }

  updateReview(reviewId: string, request: UpdateReviewRequest): Observable<ProductReviewApiDto> {
    return this.api.put<ProductReviewApiDto>(ACCOUNT_API.review(reviewId), request);
  }

  deleteReview(reviewId: string): Observable<void> {
    return this.api.delete<void>(ACCOUNT_API.review(reviewId));
  }

  getNotifications(pageNumber = 1, pageSize = 20): Observable<PagedResult<UserNotificationApiDto>> {
    return this.api.get<PagedResult<UserNotificationApiDto>>(ACCOUNT_API.notifications, {
      params: { pageNumber, pageSize },
    });
  }

  getUnreadNotificationCount(): Observable<number> {
    return this.api.get<number>(ACCOUNT_API.unreadCount);
  }

  markNotificationRead(id: string): Observable<void> {
    return this.api.patch<void>(ACCOUNT_API.markNotificationRead(id), {});
  }

  markAllNotificationsRead(): Observable<void> {
    return this.api.post<void>(ACCOUNT_API.markAllNotificationsRead, {});
  }

  getReferralDashboard(): Observable<ReferralDashboardApiDto> {
    return this.api.get<ReferralDashboardApiDto>(ACCOUNT_API.referral);
  }

  getReferralHistory(): Observable<readonly ReferralHistoryApiDto[]> {
    return this.api.get<readonly ReferralHistoryApiDto[]>(ACCOUNT_API.referralHistory);
  }

  getLibrary(query: CustomerLibraryQuery = {}): Observable<PagedResult<CustomerLibraryItemApiDto>> {
    const params: Record<string, string | number> = {
      pageNumber: query.pageNumber ?? 1,
      pageSize: query.pageSize ?? 20,
    };

    if (query.searchTerm?.trim()) {
      params['searchTerm'] = query.searchTerm.trim();
    }

    if (query.deliveryStatus) {
      params['deliveryStatus'] = query.deliveryStatus;
    }

    if (query.sort) {
      params['sort'] = query.sort;
    }

    if (query.group) {
      params['group'] = query.group;
    }

    return this.api.get(ACCOUNT_API.library, { params });
  }

  revealLibraryKey(libraryItemId: string): Observable<RevealCustomerLibraryKeyApiDto> {
    return this.api.get<RevealCustomerLibraryKeyApiDto>(ACCOUNT_API.revealLibraryKey(libraryItemId));
  }
}
