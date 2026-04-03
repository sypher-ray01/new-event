function buildEventQuery(query) {
  const filters = {};

  if (query.status) {
    if (typeof query.status !== 'string') {
      throw new Error('Invalid status parameter');
    }
    filters.status = query.status;
  }

  if (query.category) {
    if (typeof query.category !== 'string') {
      throw new Error('Invalid category parameter');
    }
    filters.category = query.category;
  }

  if (query.search) {
    if (typeof query.search !== 'string') {
      throw new Error('Invalid search parameter');
    }
    const escapedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filters.$or = [
      { title: { $regex: escapedSearch, $options: "i" } },
      { description: { $regex: escapedSearch, $options: "i" } },
      { "venue.city": { $regex: escapedSearch, $options: "i" } },
      { "venue.name": { $regex: escapedSearch, $options: "i" } }
    ];
  }

  if (query.location) {
    if (typeof query.location !== 'string') {
      throw new Error('Invalid location parameter');
    }
    const escapedLocation = query.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filters.$or = (filters.$or || []).concat([
      { "venue.city": { $regex: escapedLocation, $options: "i" } },
      { "venue.name": { $regex: escapedLocation, $options: "i" } },
      { "venue.address": { $regex: escapedLocation, $options: "i" } }
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
