import type {StateCreator} from 'zustand';
import {fnLog} from '@/shared/utils/rnLogger';
import type {AppState} from './appStore';
import {defaultFilter, type FilterItem} from '@/shared/types/filterTypes';

export type FilterSliceType = {
  activeFilter: FilterItem;
  isApplyingFilter: boolean;
  setIsApplyingFilter: (loading: boolean) => Promise<void>;
  setActiveFilter: (filter: FilterItem) => Promise<void>;
  clearActiveFilter: () => Promise<void>;
};

/**
 * FilterSliceType creator.
 *
 * Contains the state for applying filters: which filter is currently active,
 * and whether the app is currently applying a filter.
 *
 * The `setIsApplyingFilter` function sets isApplyingFilter to true or false,
 * and is idempotent. No-op if trying to set true while already true.
 *
 * The `setActiveFilter` function sets the active filter to the given filter.
 * If the filter is null, resets the active filter to null.
 *
 * The `clearActiveFilter` function clears the active filter by setting it to
 * null after a brief delay (200ms). This is used to animate the filter
 * application.
 */
export const createFilterSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  FilterSliceType
> = (set, get) => ({
  activeFilter: defaultFilter,
  isApplyingFilter: false,
  clearActiveFilter: async () => {
    try {
      const current = get().activeFilter;
      if (!current) return; // nothing to clear, bail out

      set(state => {
        state.isApplyingFilter = true;
      });

      await new Promise<void>(resolve => {
        window.setTimeout(() => {
          set(state => {
            state.activeFilter = defaultFilter;
          });
          resolve();
        }, 200);
      });

      set(state => {
        state.isApplyingFilter = false;
      });
    } catch (error) {
      set(state => {
        state.isApplyingFilter = false;
      });
      fnLog(
        'filterSlice.clearActiveFilter',
        'error',
        `Failed: ${error}`,
        error,
      );
      alert(`Failed to Apply Filter ${error}`);
    }
  },

  setIsApplyingFilter: async (loading: boolean) => {
    try {
      if (loading === undefined) {
        throw new Error('loading is undefined');
      }
      // only no-op when trying to set true while already true
      if (loading === true && get().isApplyingFilter) return;
      set(state => {
        state.isApplyingFilter = loading;
      });
    } catch (error) {
      fnLog(
        'filterSlice.setIsApplyingFilter',
        'error',
        `Failed during loading: ${error}`,
        error,
      );
      alert('Failed to Apply Filter during loading');
    }
  },

  setActiveFilter: async (filter: FilterItem) => {
    try {
      if (filter === undefined) {
        throw new Error('Filter is undefined');
      }
      set(state => {
        state.activeFilter = filter;
      });
    } catch (error) {
      fnLog('filterSlice.setActiveFilter', 'error', `Failed: ${error}`, error);
      alert(`Failed to Apply Filter ${error}`);
    }
  },
});
