const { getDatabase } = require("../../../lib/db");
const {
  createResponse,
  createErrorResponse,
  handleCors,
  authenticateToken,
} = require("../../../lib/utils");

module.exports = async (req, res) => {
  // Manejar CORS
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return res.status(corsResponse.statusCode).json(corsResponse);
  }

  if (req.method !== "GET") {
    return res.status(405).json(createErrorResponse(405, "Method not allowed"));
  }

  try {
    // Autenticar usuario
    const user = authenticateToken(req);
    const db = getDatabase();

    // Estadísticas básicas
    const total = db
      .prepare(
        "SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND deleted_at IS NULL"
      )
      .get(user.userId).count;
    const completed = db
      .prepare(
        "SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND completed = 1 AND deleted_at IS NULL"
      )
      .get(user.userId).count;
    const overdue = db
      .prepare(
        "SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND completed = 0 AND due_date IS NOT NULL AND due_date < ? AND deleted_at IS NULL"
      )
      .get(user.userId, new Date().toISOString()).count;

    // Estadísticas por prioridad
    const priorityStats = db
      .prepare(
        "SELECT priority, COUNT(*) as count FROM todos WHERE user_id = ? AND completed = 0 AND deleted_at IS NULL GROUP BY priority"
      )
      .all(user.userId);
    const byPriority = { urgent: 0, high: 0, medium: 0, low: 0 };

    priorityStats.forEach(stat => {
      if (byPriority.hasOwnProperty(stat.priority)) {
        byPriority[stat.priority] = stat.count;
      }
    });

    // Estadísticas por categoría
    const categoryStats = db
      .prepare(
        "SELECT category, COUNT(*) as count FROM todos WHERE user_id = ? AND deleted_at IS NULL GROUP BY category"
      )
      .all(user.userId);
    const byCategory = {};

    categoryStats.forEach(stat => {
      byCategory[stat.category] = stat.count;
    });

    const stats = {
      total,
      completed,
      pending: total - completed,
      overdue,
      byPriority,
      byCategory,
    };

    return res.status(200).json(createResponse(200, stats));
  } catch (error) {
    console.error("Stats API error:", error);
    if (error.message.includes("token")) {
      return res.status(401).json(createErrorResponse(401, error.message));
    }
    return res
      .status(500)
      .json(createErrorResponse(500, "Internal server error"));
  }
};
