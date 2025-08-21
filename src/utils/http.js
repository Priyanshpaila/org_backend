export const paginateParams = (req, defaults = { page: 1, limit: 20 }) => {
  const page = Math.max(parseInt(req.query.page || defaults.page, 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || defaults.limit, 10), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
