/**
 * QFOX API client — wraps native fetch with:
 *  - Base URL from NEXT_PUBLIC_API_URL
 *  - Automatic Authorization: Bearer <token> injection
 *  - 401 → redirect to /auth/login on the client side
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
};

async function request<T = unknown>(
  endpoint: string,
  { method = "GET", body, token, headers = {} }: RequestOptions = {},
): Promise<T> {
  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: "include",
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, config);

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const errorBody = await res
      .json()
      .catch(() => ({ message: res.statusText }));
    const detail =
      errorBody?.message ||
      (errorBody?.errors
        ? Object.entries(errorBody.errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : null) ||
      `HTTP ${res.status}`;
    throw new Error(detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<{
      token: string;
      refreshToken: string;
      tokenExpires: number;
      user: Record<string, unknown>;
    }>("/auth/email/login", { method: "POST", body: { email, password } }),
  me: (token: string) =>
    request<Record<string, unknown>>("/auth/me", { token }),
  refresh: (token: string) =>
    request<{ token: string; refreshToken: string; tokenExpires: number }>(
      "/auth/refresh",
      { method: "POST", token },
    ),
  sendOtp: (phone: string) =>
    request<{ message: string }>("/auth/phone/send-otp", {
      method: "POST",
      body: { phone },
    }),
  verifyOtp: (phone: string, code: string) =>
    request<{
      token: string;
      refreshToken: string;
      tokenExpires: number;
      user: Record<string, unknown>;
    }>("/auth/phone/verify-otp", { method: "POST", body: { phone, code } }),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  getSummary: (token: string, clientId?: string) =>
    request<Record<string, number>>(
      `/dashboard/summary${clientId ? `?clientId=${clientId}` : ""}`,
      { token },
    ),
  getOrdersOverTime: (token: string, days = 30) =>
    request<unknown[]>(`/dashboard/orders-over-time?days=${days}`, { token }),
  getTopItems: (token: string, limit = 10) =>
    request<unknown[]>(`/dashboard/top-items?limit=${limit}`, { token }),
  getMachinePerformance: (token: string, clientId?: string) =>
    request<unknown[]>(
      `/dashboard/machine-performance${clientId ? `?clientId=${clientId}` : ""}`,
      { token },
    ),
  getRevenueByMachine: (
    token: string,
    startDate?: string,
    endDate?: string,
  ) => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    return request<unknown[]>(
      `/dashboard/revenue-by-machine${qs ? `?${qs}` : ""}`,
      { token },
    );
  },
};

// ─── Machines ────────────────────────────────────────────────────────────────

export const machinesApi = {
  list: (token: string, params?: { clientId?: string; agentId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<unknown[]>(`/machines${qs ? `?${qs}` : ""}`, { token });
  },
  myMachines: (token: string) => request<unknown[]>("/machines/my", { token }),
  get: (token: string, id: string) =>
    request<Record<string, unknown>>(`/machines/${id}`, { token }),
  create: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/machines", {
      method: "POST",
      body: data,
      token,
    }),
  update: (token: string, id: string, data: unknown) =>
    request<Record<string, unknown>>(`/machines/${id}`, {
      method: "PATCH",
      body: data,
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/machines/${id}`, { method: "DELETE", token }),
  updateInventory: (token: string, machineId: string, data: unknown) =>
    request<Record<string, unknown>>(`/machines/${machineId}/inventory`, {
      method: "PATCH",
      body: data,
      token,
    }),
  nearExpiryItems: (token: string, machineId: string) =>
    request<
      {
        itemId: string;
        itemName: string;
        batchId: string;
        expiryDate: string;
        hoursRemaining: number;
        discountPct: number;
        quantity: number;
      }[]
    >(`/machines/${machineId}/near-expiry-items`, { token }),
  flush: (
    token: string,
    machineId: string,
    type: "daily" | "weekly" = "daily",
  ) =>
    request<{ message: string }>(`/machines/${machineId}/flush?type=${type}`, {
      method: "POST",
      token,
    }),
  updateCalibration: (token: string, machineId: string, data: unknown) =>
    request<Record<string, unknown>>(`/machines/${machineId}/calibration`, {
      method: "PATCH",
      body: data,
      token,
    }),
  sleep: (token: string, machineId: string) =>
    request<{ message: string }>(`/machines/${machineId}/sleep`, {
      method: "POST",
      token,
    }),
  wake: (token: string, machineId: string) =>
    request<{ message: string }>(`/machines/${machineId}/wake`, {
      method: "POST",
      token,
    }),
  // Food machine batches
  addBatch: (token: string, machineId: string, data: unknown) =>
    request<unknown>(`/machines/${machineId}/batches`, {
      method: "POST",
      body: data,
      token,
    }),
  getBatches: (token: string, machineId: string) =>
    request<unknown[]>(`/machines/${machineId}/batches`, { token }),
  deleteBatch: (token: string, machineId: string, batchId: string) =>
    request<void>(`/machines/${machineId}/batches/${batchId}`, {
      method: "DELETE",
      token,
    }),
  removeItem: (token: string, machineId: string, itemId: string) =>
    request<void>(`/machines/${machineId}/items/${itemId}`, {
      method: "DELETE",
      token,
    }),
};

// ─── Items ───────────────────────────────────────────────────────────────────

export const itemsApi = {
  list: (token: string, params?: { category?: string; itemType?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<unknown[]>(`/items${qs ? `?${qs}` : ""}`, { token });
  },
  get: (token: string, id: string) =>
    request<Record<string, unknown>>(`/items/${id}`, { token }),
  create: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/items", {
      method: "POST",
      body: data,
      token,
    }),
  update: (token: string, id: string, data: unknown) =>
    request<Record<string, unknown>>(`/items/${id}`, {
      method: "PATCH",
      body: data,
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/items/${id}`, { method: "DELETE", token }),
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (
    token: string,
    params?: {
      machineId?: string;
      status?: string;
      userId?: string;
      agentId?: string;
    },
  ) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<unknown[]>(`/orders${qs ? `?${qs}` : ""}`, { token });
  },
  myOrders: (token: string) => request<unknown[]>("/orders/my", { token }),
  get: (token: string, id: string) =>
    request<Record<string, unknown>>(`/orders/${id}`, { token }),
  place: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/orders", {
      method: "POST",
      body: data,
      token,
    }),
  complete: (token: string, id: string) =>
    request<Record<string, unknown>>(`/orders/${id}/complete`, {
      method: "PATCH",
      token,
    }),
  fail: (token: string, id: string, reason?: string) =>
    request<Record<string, unknown>>(`/orders/${id}/fail`, {
      method: "PATCH",
      body: { reason: reason || "Agent failed" },
      token,
    }),
};

// ─── Wallet ──────────────────────────────────────────────────────────────────

export const walletApi = {
  getMyWallet: (token: string) =>
    request<Record<string, unknown>>("/wallet/me", { token }),
  getMyBalance: (token: string) =>
    request<{ balance: number }>("/wallet/me/balance", { token }),
  getBalance: (token: string) =>
    request<{ balance: number }>("/wallet/me/balance", { token }),
  requestTopup: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/wallet/me/topup", {
      method: "POST",
      body: data,
      token,
    }),
  topup: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/wallet/me/topup", {
      method: "POST",
      body: data,
      token,
    }),
  getMyTransactions: (token: string, limit = 50, skip = 0) =>
    request<unknown[]>(`/wallet/me/transactions?limit=${limit}&skip=${skip}`, {
      token,
    }),
  getTransactions: (token: string, limit = 50, skip = 0) =>
    request<unknown[]>(`/wallet/me/transactions?limit=${limit}&skip=${skip}`, {
      token,
    }),
  agentTopup: (
    token: string,
    data: { targetUserId: string; amount: number; note?: string },
  ) =>
    request<Record<string, unknown>>("/wallet/agent-topup", {
      method: "POST",
      body: data,
      token,
    }),
  // Admin
  getAllWallets: (token: string) => request<unknown[]>("/wallet", { token }),
  getUserWallet: (token: string, userId: string) =>
    request<Record<string, unknown>>(`/wallet/user/${userId}`, { token }),
  adminTopup: (token: string, userId: string, data: unknown) =>
    request<Record<string, unknown>>(`/wallet/user/${userId}/topup`, {
      method: "POST",
      body: data,
      token,
    }),
  // Bank slip approval
  getPendingTopups: (token: string) =>
    request<unknown[]>("/wallet/topup/pending", { token }),
  verifyTopup: (token: string, id: string) =>
    request<Record<string, unknown>>(`/wallet/topup/${id}/verify`, {
      method: "PATCH",
      token,
    }),
  rejectTopup: (token: string, id: string, reason?: string) =>
    request<Record<string, unknown>>(`/wallet/topup/${id}/reject`, {
      method: "PATCH",
      body: { reason },
      token,
    }),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────

export const alertsApi = {
  list: (token: string, machineId?: string, resolved?: boolean) => {
    const params = new URLSearchParams();
    if (machineId) params.set("machineId", machineId);
    if (resolved !== undefined) params.set("resolved", String(resolved));
    const qs = params.toString();
    return request<unknown[]>(`/alerts${qs ? `?${qs}` : ""}`, { token });
  },
  get: (token: string, id: string) =>
    request<Record<string, unknown>>(`/alerts/${id}`, { token }),
  resolve: (token: string, id: string) =>
    request<Record<string, unknown>>(`/alerts/${id}/resolve`, {
      method: "PATCH",
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/alerts/${id}`, { method: "DELETE", token }),
  getUnresolvedCount: (token: string) =>
    request<{ count: number }>("/alerts/unresolved-count", { token }),
};

// ─── Outlets ─────────────────────────────────────────────────────────────────

export const outletsApi = {
  list: (token: string) => request<unknown[]>("/outlets", { token }),
  get: (token: string, id: string) =>
    request<Record<string, unknown>>(`/outlets/${id}`, { token }),
  create: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/outlets", {
      method: "POST",
      body: data,
      token,
    }),
  update: (token: string, id: string, data: unknown) =>
    request<Record<string, unknown>>(`/outlets/${id}`, {
      method: "PATCH",
      body: data,
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/outlets/${id}`, { method: "DELETE", token }),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (token: string) =>
    request<{ data: unknown[]; hasNextPage: boolean }>(
      "/users?limit=50&page=1",
      { token },
    ).then((r) => r.data),
  get: (token: string, id: string) =>
    request<Record<string, unknown>>(`/users/${id}`, { token }),
  create: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/users", {
      method: "POST",
      body: data,
      token,
    }),
  update: (token: string, id: string, data: unknown) =>
    request<Record<string, unknown>>(`/users/${id}`, {
      method: "PATCH",
      body: data,
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/users/${id}`, { method: "DELETE", token }),
  approveAgent: (token: string, id: string) =>
    request<Record<string, unknown>>(`/users/${id}/approve-agent`, {
      method: "PATCH",
      token,
    }),
};

// ─── Memberships ─────────────────────────────────────────────────────────────

export const membershipsApi = {
  list: (token: string) => request<unknown[]>("/memberships", { token }),
  my: (token: string) =>
    request<Record<string, unknown>>("/memberships/my", { token }),
  subscribe: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/memberships/subscribe", {
      method: "POST",
      body: data,
      token,
    }),
  cancel: (token: string, id: string) =>
    request<void>(`/memberships/${id}/cancel`, { method: "PATCH", token }),
};

// ─── Organizations ───────────────────────────────────────────────────────────

export const organizationsApi = {
  list: (token: string) => request<unknown[]>("/organizations", { token }),
  create: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/organizations", {
      method: "POST",
      body: data,
      token,
    }),
  update: (token: string, id: string, data: unknown) =>
    request<Record<string, unknown>>(`/organizations/${id}`, {
      method: "PATCH",
      body: data,
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/organizations/${id}`, { method: "DELETE", token }),
  assignMachine: (token: string, id: string, machineId: string) =>
    request<unknown>(`/organizations/${id}/machines`, {
      method: "POST",
      body: { machineId },
      token,
    }),
  removeMachine: (token: string, id: string, machineId: string) =>
    request<void>(`/organizations/${id}/machines/${machineId}`, {
      method: "DELETE",
      token,
    }),
  assignAgent: (token: string, id: string, agentId: string) =>
    request<unknown>(`/organizations/${id}/agents`, {
      method: "POST",
      body: { agentId },
      token,
    }),
  removeAgent: (token: string, id: string, agentId: string) =>
    request<void>(`/organizations/${id}/agents/${agentId}`, {
      method: "DELETE",
      token,
    }),
};

// ─── Promotions ──────────────────────────────────────────────────────────────

export const promotionsApi = {
  list: (token: string) => request<unknown[]>("/promotions", { token }),
  listActive: () => request<unknown[]>("/promotions/active"),
  get: (token: string, id: string) =>
    request<Record<string, unknown>>(`/promotions/${id}`, { token }),
  create: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/promotions", {
      method: "POST",
      body: data,
      token,
    }),
  update: (token: string, id: string, data: unknown) =>
    request<Record<string, unknown>>(`/promotions/${id}`, {
      method: "PATCH",
      body: data,
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/promotions/${id}`, { method: "DELETE", token }),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (token: string, unreadOnly?: boolean) =>
    request<unknown[]>(
      `/notifications${unreadOnly ? "?unreadOnly=true" : ""}`,
      { token },
    ),
  getUnreadCount: (token: string) =>
    request<{ count: number }>("/notifications/unread-count", { token }),
  markRead: (token: string, id: string) =>
    request<unknown>(`/notifications/${id}/read`, { method: "PATCH", token }),
  markAllRead: (token: string) =>
    request<{ modified: number }>("/notifications/read-all", {
      method: "PATCH",
      token,
    }),
};

// ─── Agents ───────────────────────────────────────────────────────────────────

export const agentsApi = {
  activityLog: (token: string) =>
    request<unknown[]>("/agents/activity-log", { token }),
  fileInspection: (
    token: string,
    data: {
      machineId: string;
      passed: boolean;
      failedChecks: string[];
      notes: string;
      severity: string;
    },
  ) =>
    request<{ passed: boolean; alertCreated: boolean }>("/agents/inspection", {
      method: "POST",
      body: data,
      token,
    }),
};

// ─── Reservations ─────────────────────────────────────────────────────────────

export const reservationsApi = {
  create: (token: string, data: unknown) =>
    request<Record<string, unknown>>("/reservations", {
      method: "POST",
      body: data,
      token,
    }),
  list: (
    token: string,
    params?: { machineId?: string; status?: string; date?: string },
  ) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<unknown[]>(`/reservations${qs ? `?${qs}` : ""}`, { token });
  },
  myReservations: (token: string) =>
    request<unknown[]>("/reservations/my", { token }),
  confirm: (token: string, id: string) =>
    request<Record<string, unknown>>(`/reservations/${id}/confirm`, {
      method: "PATCH",
      token,
    }),
  complete: (token: string, id: string) =>
    request<Record<string, unknown>>(`/reservations/${id}/complete`, {
      method: "PATCH",
      token,
    }),
  cancel: (token: string, id: string, reason?: string) =>
    request<Record<string, unknown>>(`/reservations/${id}/cancel`, {
      method: "PATCH",
      body: { reason },
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/reservations/${id}`, { method: "DELETE", token }),
};
