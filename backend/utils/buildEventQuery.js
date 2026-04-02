function buildEventQuery(query) {
  const filters = {};

  if (query.status) {
    filters.status = query.status;
  }

  if (query.category) {
    filters.category = query.category;
  }

  if (query.search) {
    filters.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { "venue.city": { $regex: query.search, $options: "i" } },
      { "venue.name": { $regex: query.search, $options: "i" } }
    ];
  }

  if (query.location) {
    filters.$or = (filters.$or || []).concat([
      { "venue.city": { $regex: query.location, $options: "i" } },
      { "venue.name": { $regex: query.location, $options: "i" } },
      { "venue.address": { $regex: query.location, $options: "i" } }
    ]);
  }

  if (query.startDate || query.endDate) {
    filters.startDate = {};
    if (query.startDate) {
      filters.startDate.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.startDate.$lte = new Date(query.endDate);
    }
  }

  if (query.minPrice || query.maxPrice) {
    filters.price = {};
    if (query.minPrice) {
      filters.price.$gte = Number(query.minPrice);
    }
    if (query.maxPrice) {
      filters.price.$lte = Number(query.maxPrice);
    }
  }

  return filters;
}

module.exports = buildEventQuery;
