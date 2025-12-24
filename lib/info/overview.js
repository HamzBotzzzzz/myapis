module.exports = function runOverview({ categories }) {
  const allEndpoints = categories.flatMap(c => c.items || []);

  const total = allEndpoints.length;
  const active = allEndpoints.filter(e => e.status === "ready").length;

  return {
    status: active === total ? "live" : "degraded",
    version: process.env.API_VERSION || "v2.0.0",
    uptime: Math.floor(process.uptime()) + "s",
    endpoints: {
      total,
      active,
      inactive: total - active
    },
    system: {
      node: process.version,
      platform: process.platform,
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    meta: {
      source: "runtime",
      generated_at: new Date().toISOString()
    }
  };
};