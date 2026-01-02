/**
 * Pagination, Sorting, and Filtering Utility
 *
 * Provides reusable types and helpers for paginated list endpoints.
 */

// Generic paginated response type
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Base query options that all entities can use
export interface BaseQueryOptions {
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Default pagination values
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
export const DEFAULT_OFFSET = 0;

/**
 * Parse and validate pagination parameters from request query
 */
export function parsePaginationParams(query: Record<string, any>): {
  limit: number;
  offset: number;
} {
  const requestedLimit = query.limit ? parseInt(query.limit as string, 10) : DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);
  const offset = Math.max(0, query.offset ? parseInt(query.offset as string, 10) : DEFAULT_OFFSET);

  return { limit, offset };
}

/**
 * Parse and validate sort parameters from request query
 */
export function parseSortParams(
  query: Record<string, any>,
  allowedFields: string[],
  defaultField: string = 'created_at'
): {
  sort_by: string;
  sort_order: 'asc' | 'desc';
} {
  const requestedSortBy = query.sort_by as string | undefined;
  const sort_by = requestedSortBy && allowedFields.includes(requestedSortBy)
    ? requestedSortBy
    : defaultField;

  const requestedSortOrder = query.sort_order as string | undefined;
  const sort_order: 'asc' | 'desc' = requestedSortOrder === 'asc' ? 'asc' : 'desc';

  return { sort_by, sort_order };
}

/**
 * Parse search parameter from request query
 */
export function parseSearchParam(query: Record<string, any>): string | undefined {
  const search = query.search as string | undefined;
  return search?.trim() || undefined;
}

/**
 * Build SQL ORDER BY clause with safe column name
 */
export function buildOrderByClause(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  tableAlias?: string
): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const direction = sortOrder.toUpperCase();
  return `${prefix}${sortBy} ${direction}`;
}

/**
 * Build SQL LIMIT/OFFSET clause
 */
export function buildPaginationClause(limit: number, offset: number): string {
  return `LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Helper to build ILIKE search condition for multiple columns
 */
export function buildSearchCondition(
  columns: string[],
  paramIndex: number,
  tableAlias?: string
): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const conditions = columns.map(col => `${prefix}${col} ILIKE $${paramIndex}`);
  return `(${conditions.join(' OR ')})`;
}
