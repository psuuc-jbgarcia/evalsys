const getPagination = (req, options = {}) => {
  const requested = req.query.paginate === 'true' || req.query.page !== undefined;
  if (!requested) return null;

  const defaultLimit = options.defaultLimit || 50;
  const maxLimit = options.maxLimit || 200;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(req.query.limit, 10) || defaultLimit)
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const paginatedPayload = (items, total, pagination) => ({
  items,
  pagination: {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
    hasPreviousPage: pagination.page > 1,
    hasNextPage: pagination.page * pagination.limit < total,
  },
});

module.exports = { getPagination, paginatedPayload };
