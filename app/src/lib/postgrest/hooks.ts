"use client";

import { useState, useCallback } from "react";
import { PostgRESTClient, PostgRESTError, PostgRESTQueryParams } from "./client";

interface QueryState<T> {
  data: T[];
  error: PostgRESTError | null;
  loading: boolean;
}

export function usePostgRESTQuery<T = Record<string, unknown>>(
  client: PostgRESTClient,
  table: string,
  columns: string = "*",
  params: Omit<PostgRESTQueryParams, "select"> = {},
  options: { enabled?: boolean } = { enabled: true }
) {
  const [state, setState] = useState<QueryState<T>>({
    data: [],
    error: null,
    loading: true,
  });

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await client.from<T>(table).select(columns, params);
      setState({ data: result, error: null, loading: false });
    } catch (err) {
      setState({ data: [], error: err as PostgRESTError, loading: false });
    }
  }, [client, table, columns, params]);

  // Note: For production, consider using TanStack Query for proper caching
  // and refetch on param changes
  if (options.enabled !== false && state.loading && state.data.length === 0) {
    refetch();
  }

  return { ...state, refetch };
}

export function usePostgRESTMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgRESTError | null>(null);

  const mutate = useCallback(async (mutationFn: () => Promise<unknown[]>) => {
    setLoading(true);
    setError(null);
    try {
      return await mutationFn();
    } catch (err) {
      setError(err as PostgRESTError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
}
