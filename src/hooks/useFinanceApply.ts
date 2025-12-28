/**
 * useFinanceApply.ts
 *
 * React hook wrapper around financeApplyRPC.
 * - Exposes apply() method
 * - Provides loading / error state
 * - Supports optimistic UI callback hooks (onMutate/onSuccess/onError)
 */

import React from 'react';
import { financeApplyRPC, FinanceApplyPayload, FinanceApplyResult } from '../utils/financeRpc';

export interface UseFinanceApplyOptions {
  /**
   * onMutate
   * @description Called immediately before the RPC; can be used for optimistic updates.
   *              Return a context object (any) that will be passed to onError/onSuccess.
   */
  onMutate?: (payload: FinanceApplyPayload) => any;
  /**
   * onSuccess
   * @description Called when RPC returns successfully. Receives RPC result and mutateContext.
   */
  onSuccess?: (result: FinanceApplyResult, payload: FinanceApplyPayload, context?: any) => void;
  /**
   * onError
   * @description Called when RPC fails. Receives error and mutateContext.
   */
  onError?: (error: Error, payload: FinanceApplyPayload, context?: any) => void;
}

/**
 * useFinanceApply
 * @description Hook to perform finance_apply operations from UI code.
 * @returns { apply, loading, error }
 */
export function useFinanceApply(options?: UseFinanceApplyOptions) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  /**
   * apply
   * @description Perform a finance_apply RPC call with optional optimistic handlers.
   */
  const apply = React.useCallback(
    async (payload: FinanceApplyPayload) => {
      setError(null);
      setLoading(true);

      // optimistic
      let context: any = undefined;
      try {
        if (options?.onMutate) {
          try {
            context = options.onMutate(payload);
          } catch (e) {
            // swallow optimistic handler errors
            // eslint-disable-next-line no-console
            console.warn('[useFinanceApply] onMutate handler threw:', e);
          }
        }

        const result = await financeApplyRPC(payload);

        if (options?.onSuccess) {
          try {
            options.onSuccess(result, payload, context);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[useFinanceApply] onSuccess handler threw:', e);
          }
        }

        setLoading(false);
        return result;
      } catch (err: any) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);

        if (options?.onError) {
          try {
            options.onError(errorObj, payload, context);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[useFinanceApply] onError handler threw:', e);
          }
        }

        setLoading(false);
        throw errorObj;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(options ?? {})]
  );

  return { apply, loading, error };
}