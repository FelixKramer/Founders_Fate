/**
 * LaunchPad PostgREST Client
 * 
 * The core innovation: Your database IS your API.
 * 
 * Tables auto-map to REST endpoints:
 *   GET    /rest/todos           → SELECT * FROM todos;
 *   POST   /rest/todos           → INSERT INTO todos ...
 *   PATCH  /rest/todos?id=eq.1   → UPDATE todos ... WHERE id = 1;
 *   DELETE /rest/todos?id=eq.1   → DELETE FROM todos WHERE id = 1;
 * 
 * Row Level Security (RLS) ensures users can only access their own data.
 * JWT tokens from auth are passed directly to PostgREST.
 */

export interface PostgRESTClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export interface PostgRESTQueryParams {
  select?: string;
  filter?: Record<string, string>;
  order?: string;
  limit?: number;
  offset?: number;
}

export class PostgRESTError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`PostgREST Error ${status}: ${detail}`);
    this.status = status;
    this.detail = detail;
  }
}

export class PostgRESTClient {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;

  constructor(config: PostgRESTClientConfig) {
    this.baseUrl = config.baseUrl;
    this.getToken = config.getToken;
  }

  private async headers(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private buildQueryString(params: PostgRESTQueryParams): string {
    const sp = new URLSearchParams();
    if (params.select) sp.set("select", params.select);
    if (params.filter) Object.entries(params.filter).forEach(([k, v]) => sp.set(k, v));
    if (params.order) sp.set("order", params.order);
    if (params.limit !== undefined) sp.set("limit", String(params.limit));
    if (params.offset !== undefined) sp.set("offset", String(params.offset));
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
  }

  private async parseResponse<T>(res: Response): Promise<T[]> {
    const data = await res.json();
    return Array.isArray(data) ? data : [data];
  }

  from<T = Record<string, unknown>>(table: string) {
    return {
      select: async (columns: string = "*", params: Omit<PostgRESTQueryParams, "select"> = {}): Promise<T[]> => {
        const qs = this.buildQueryString({ ...params, select: columns });
        const res = await fetch(`${this.baseUrl}/${table}${qs}`, {
          method: "GET",
          headers: await this.headers(),
        });
        if (!res.ok) throw new PostgRESTError(res.status, await res.text());
        return this.parseResponse<T>(res);
      },

      insert: async (data: Record<string, unknown> | Record<string, unknown>[]): Promise<T[]> => {
        const res = await fetch(`${this.baseUrl}/${table}`, {
          method: "POST",
          headers: await this.headers(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new PostgRESTError(res.status, await res.text());
        return this.parseResponse<T>(res);
      },

      update: async (data: Record<string, unknown>, filter: Record<string, string>): Promise<T[]> => {
        const qs = this.buildQueryString({ filter });
        const res = await fetch(`${this.baseUrl}/${table}${qs}`, {
          method: "PATCH",
          headers: await this.headers(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new PostgRESTError(res.status, await res.text());
        return this.parseResponse<T>(res);
      },

      delete: async (filter: Record<string, string>): Promise<T[]> => {
        const qs = this.buildQueryString({ filter });
        const res = await fetch(`${this.baseUrl}/${table}${qs}`, {
          method: "DELETE",
          headers: await this.headers(),
        });
        if (!res.ok) throw new PostgRESTError(res.status, await res.text());
        return this.parseResponse<T>(res);
      },

      rpc: async (functionName: string, args: Record<string, unknown> = {}): Promise<T[]> => {
        const res = await fetch(`${this.baseUrl}/rpc/${functionName}`, {
          method: "POST",
          headers: await this.headers(),
          body: JSON.stringify(args),
        });
        if (!res.ok) throw new PostgRESTError(res.status, await res.text());
        return this.parseResponse<T>(res);
      },
    };
  }
}
