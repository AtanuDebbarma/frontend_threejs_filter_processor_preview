import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import type {FilterItem} from '../types/filterTypes';

export type FilterSliceType = {
  activeFilter: FilterItem | null;
  isApplyingFilter: boolean;
  setIsApplyingFilter: (loading: boolean) => Promise<void>;
  setActiveFilter: (filter: FilterItem | null) => Promise<void>;
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
  activeFilter: null,
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
            state.activeFilter = null;
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
      console.error('Failed to Apply Filter', error);
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
      console.error('Failed to Apply Filter, during loading', error);
      alert('Failed to Apply Filter during loading');
    }
  },

  setActiveFilter: async (filter: FilterItem | null) => {
    try {
      if (filter === undefined) {
        throw new Error('Filter is undefined');
      }
      set(state => {
        state.activeFilter = filter;
      });
    } catch (error) {
      console.error('Failed to Apply Filter', error);
      alert(`Failed to Apply Filter ${error}`);
    }
  },
});
