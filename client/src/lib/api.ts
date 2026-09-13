export type AdminUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
};

export type AdminSpace = {
  id: number;
  ownerId: number;
  name: string;
  description: string | null;
  allowComments: boolean;
  status: "active" | "paused" | "archived";
  expiresAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateSpaceInput = {
  name: string;
  description?: string | null;
  allowComments?: boolean;
  expiresAt?: string | null;
};

type UpdateSpaceInput = Partial<CreateSpaceInput>;

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } & T | null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.error?.code ?? "UNKNOWN_ERROR", body?.error?.message ?? "Request failed");
  }
  return body as T;
}

export const api = {
  admin: {
    login: () => request<{ user: AdminUser }>("/api/admin/login", { method: "POST" }),
    listSpaces: () => request<{ spaces: AdminSpace[] }>("/api/admin/spaces"),
    createSpace: (input: CreateSpaceInput) => request<{ space: AdminSpace; shareUrl: string }>("/api/admin/spaces", { method: "POST", body: JSON.stringify(input) }),
    updateSpace: (id: number, input: UpdateSpaceInput) => request<{ space: AdminSpace }>(`/api/admin/spaces/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    resetShareLink: (id: number) => request<{ shareUrl: string }>(`/api/admin/spaces/${id}/reset-link`, { method: "POST" }),
    archiveSpace: (id: number) => request<{ ok: true }>(`/api/admin/spaces/${id}`, { method: "DELETE" }),
  },
};
