const { getInMemoryDatabase } = require("../../lib/memoryDb");
const { verifyToken } = require("../../lib/authMiddleware");
const {
  createSuccessResponse,
  createErrorResponse,
  sendResponse,
  handleApiError,
  checkRateLimit,
} = require("../../lib/apiHelpers");

// GET: Obtener estadísticas del usuario
async function getUserStats(req, res) {
  try {
    // Rate limiting
    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    checkRateLimit(clientIP, 60, 15 * 60 * 1000); // 60 requests por 15 minutos

    const { userId } = req.user;
    console.log(`[STATS] Getting statistics for user: ${userId}`);

    const db = getInMemoryDatabase();

    // Obtener todos los TODOs del usuario
    const allTodos = db.getTodosByUserId(userId);

    // Calcular estadísticas básicas
    const totalTodos = allTodos.length;
    const completedTodos = allTodos.filter((todo) => todo.completed).length;
    const pendingTodos = totalTodos - completedTodos;
    const completionRate =
      totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    // Estadísticas por prioridad
    const priorityStats = {
      urgent: allTodos.filter((todo) => todo.priority === "urgent").length,
      high: allTodos.filter((todo) => todo.priority === "high").length,
      medium: allTodos.filter((todo) => todo.priority === "medium").length,
      low: allTodos.filter((todo) => todo.priority === "low").length,
    };

    // Estadísticas por categoría
    const categoryStats = {
      personal: allTodos.filter((todo) => todo.category === "personal").length,
      work: allTodos.filter((todo) => todo.category === "work").length,
      shopping: allTodos.filter((todo) => todo.category === "shopping").length,
      health: allTodos.filter((todo) => todo.category === "health").length,
      finance: allTodos.filter((todo) => todo.category === "finance").length,
      education: allTodos.filter((todo) => todo.category === "education")
        .length,
    };

    // TODOs vencidos (overdue)
    const now = new Date();
    const overdueTodos = allTodos.filter((todo) => {
      if (!todo.due_date || todo.completed) return false;
      return new Date(todo.due_date) < now;
    }).length;

    // TODOs próximos a vencer (en los próximos 7 días)
    const upcomingDueDate = new Date();
    upcomingDueDate.setDate(upcomingDueDate.getDate() + 7);

    const upcomingTodos = allTodos.filter((todo) => {
      if (!todo.due_date || todo.completed) return false;
      const dueDate = new Date(todo.due_date);
      return dueDate >= now && dueDate <= upcomingDueDate;
    }).length;

    // Actividad reciente (últimos 7 días)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentTodos = allTodos.filter((todo) => {
      const createdDate = new Date(todo.created_at || todo.createdAt);
      return createdDate >= weekAgo;
    }).length;

    const recentCompletions = allTodos.filter((todo) => {
      if (!todo.completed) return false;
      // Asumiendo que hay un campo updated_at para cuando se completó
      const updatedDate = new Date(
        todo.updated_at || todo.updatedAt || todo.created_at || todo.createdAt
      );
      return updatedDate >= weekAgo;
    }).length;

    // Estadísticas de productividad
    const productivityStats = {
      todosCreatedThisWeek: recentTodos,
      todosCompletedThisWeek: recentCompletions,
      overdueTodos,
      upcomingDeadlines: upcomingTodos,
      averageCompletionRate: completionRate,
    };

    // Tags más utilizados
    const tagCounts = {};
    allTodos.forEach((todo) => {
      if (todo.tags) {
        let tags = todo.tags;
        if (typeof tags === "string") {
          try {
            tags = JSON.parse(tags);
          } catch (e) {
            tags = [];
          }
        }
        if (Array.isArray(tags)) {
          tags.forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      }
    });

    // Top 5 tags más utilizados
    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    const responseData = {
      overview: {
        totalTodos,
        completedTodos,
        pendingTodos,
        completionRate,
      },
      priorities: priorityStats,
      categories: categoryStats,
      productivity: productivityStats,
      topTags,
      insights: {
        mostUsedCategory:
          Object.entries(categoryStats).sort(([, a], [, b]) => b - a)[0]?.[0] ||
          "none",
        mostUsedPriority:
          Object.entries(priorityStats).sort(([, a], [, b]) => b - a)[0]?.[0] ||
          "none",
        needsAttention:
          overdueTodos > 0
            ? "You have overdue tasks that need attention!"
            : null,
        productivity:
          recentCompletions > recentTodos * 0.7
            ? "Great productivity this week!"
            : "Focus on completing more tasks!",
      },
    };

    console.log(
      `[STATS] Retrieved statistics for user ${userId}: ${totalTodos} total todos, ${completionRate}% completion rate`
    );
    return sendResponse(
      res,
      createSuccessResponse(responseData, "Statistics retrieved successfully")
    );
  } catch (error) {
    return handleApiError(error, req, res);
  }
}

module.exports = async (req, res) => {
  console.log(`[STATS API] ${req.method} request received`);
  console.log("[STATS API] Headers:", JSON.stringify(req.headers, null, 2));

  // Configurar headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[STATS API] CORS preflight request handled");
    res.status(200).end();
    return;
  }

  // Solo permitir GET
  if (req.method !== "GET") {
    console.warn(`[STATS API] Method ${req.method} not allowed`);
    return sendResponse(
      res,
      createErrorResponse(`Method ${req.method} Not Allowed. Use GET.`, 405)
    );
  }

  // Verificar autenticación
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (error) {
    console.error("[STATS API] Authentication failed:", error.message);
    return; // verifyToken ya envió la respuesta
  }

  // Manejar GET request
  try {
    return await getUserStats(req, res);
  } catch (error) {
    return handleApiError(error, req, res);
  }
};
