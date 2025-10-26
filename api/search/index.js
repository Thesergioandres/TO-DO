const { getInMemoryDatabase } = require("../../lib/memoryDb");
const { verifyToken } = require("../../lib/authMiddleware");
const {
  createSuccessResponse,
  createErrorResponse,
  sendResponse,
  handleApiError,
  validatePriority,
  validateCategory,
  validateDate,
  checkRateLimit,
} = require("../../lib/apiHelpers");

// GET: Búsqueda avanzada de TODOs
async function advancedSearch(req, res) {
  try {
    // Rate limiting
    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    checkRateLimit(clientIP, 100, 15 * 60 * 1000); // 100 búsquedas por 15 minutos

    const { userId } = req.user;
    const {
      query = "",
      priority,
      category,
      completed,
      tags,
      dueDateFrom,
      dueDateTo,
      createdFrom,
      createdTo,
      hasDescription,
      hasDueDate,
      overdue,
      sortBy = "created_at",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    console.log(`[SEARCH] Advanced search for user: ${userId}`);
    console.log(`[SEARCH] Filters:`, {
      query,
      priority,
      category,
      completed,
      tags,
      dueDateFrom,
      dueDateTo,
      createdFrom,
      createdTo,
      hasDescription,
      hasDueDate,
      overdue,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    // Validaciones
    if (limit > 100) {
      throw new Error("Limit cannot exceed 100");
    }

    if (priority) {
      validatePriority(priority);
    }

    if (category) {
      validateCategory(category);
    }

    if (dueDateFrom) {
      validateDate(dueDateFrom);
    }

    if (dueDateTo) {
      validateDate(dueDateTo);
    }

    if (createdFrom) {
      validateDate(createdFrom);
    }

    if (createdTo) {
      validateDate(createdTo);
    }

    const validSortFields = [
      "created_at",
      "updated_at",
      "title",
      "priority",
      "due_date",
      "completed",
    ];
    if (!validSortFields.includes(sortBy)) {
      throw new Error(`sortBy must be one of: ${validSortFields.join(", ")}`);
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      throw new Error('sortOrder must be either "asc" or "desc"');
    }

    const db = getInMemoryDatabase();

    // Obtener todos los TODOs del usuario
    let todos = db.getTodosByUserId(userId);

    console.log(`[SEARCH] Starting with ${todos.length} todos`);

    // Aplicar filtros

    // 1. Búsqueda por texto
    if (query && query.trim()) {
      const searchQuery = query.toLowerCase().trim();
      todos = todos.filter((todo) => {
        const titleMatch = todo.title.toLowerCase().includes(searchQuery);
        const descriptionMatch =
          todo.description &&
          todo.description.toLowerCase().includes(searchQuery);

        // Buscar en tags
        let tagsMatch = false;
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
            tagsMatch = tags.some((tag) =>
              tag.toLowerCase().includes(searchQuery)
            );
          }
        }

        return titleMatch || descriptionMatch || tagsMatch;
      });
      console.log(`[SEARCH] After text search: ${todos.length} todos`);
    }

    // 2. Filtro por prioridad
    if (priority) {
      todos = todos.filter((todo) => todo.priority === priority);
      console.log(`[SEARCH] After priority filter: ${todos.length} todos`);
    }

    // 3. Filtro por categoría
    if (category) {
      todos = todos.filter((todo) => todo.category === category);
      console.log(`[SEARCH] After category filter: ${todos.length} todos`);
    }

    // 4. Filtro por estado completado
    if (completed !== undefined) {
      const isCompleted = completed === "true";
      todos = todos.filter((todo) => Boolean(todo.completed) === isCompleted);
      console.log(`[SEARCH] After completed filter: ${todos.length} todos`);
    }

    // 5. Filtro por tags
    if (tags) {
      const searchTags = Array.isArray(tags) ? tags : [tags];
      todos = todos.filter((todo) => {
        if (!todo.tags) return false;

        let todoTags = todo.tags;
        if (typeof todoTags === "string") {
          try {
            todoTags = JSON.parse(todoTags);
          } catch (e) {
            return false;
          }
        }

        if (!Array.isArray(todoTags)) return false;

        // Verificar si el TODO tiene al menos uno de los tags buscados
        return searchTags.some((searchTag) =>
          todoTags.some((todoTag) =>
            todoTag.toLowerCase().includes(searchTag.toLowerCase())
          )
        );
      });
      console.log(`[SEARCH] After tags filter: ${todos.length} todos`);
    }

    // 6. Filtro por rango de fechas de vencimiento
    if (dueDateFrom || dueDateTo) {
      todos = todos.filter((todo) => {
        if (!todo.due_date) return false;

        const dueDate = new Date(todo.due_date);

        if (dueDateFrom && dueDate < new Date(dueDateFrom)) return false;
        if (dueDateTo && dueDate > new Date(dueDateTo)) return false;

        return true;
      });
      console.log(
        `[SEARCH] After due date range filter: ${todos.length} todos`
      );
    }

    // 7. Filtro por rango de fechas de creación
    if (createdFrom || createdTo) {
      todos = todos.filter((todo) => {
        const createdDate = new Date(todo.created_at || todo.createdAt);

        if (createdFrom && createdDate < new Date(createdFrom)) return false;
        if (createdTo && createdDate > new Date(createdTo)) return false;

        return true;
      });
      console.log(
        `[SEARCH] After created date range filter: ${todos.length} todos`
      );
    }

    // 8. Filtro por presencia de descripción
    if (hasDescription !== undefined) {
      const shouldHaveDescription = hasDescription === "true";
      todos = todos.filter((todo) => {
        const hasDesc = Boolean(todo.description && todo.description.trim());
        return hasDesc === shouldHaveDescription;
      });
      console.log(`[SEARCH] After description filter: ${todos.length} todos`);
    }

    // 9. Filtro por presencia de fecha de vencimiento
    if (hasDueDate !== undefined) {
      const shouldHaveDueDate = hasDueDate === "true";
      todos = todos.filter(
        (todo) => Boolean(todo.due_date) === shouldHaveDueDate
      );
      console.log(
        `[SEARCH] After due date presence filter: ${todos.length} todos`
      );
    }

    // 10. Filtro por TODOs vencidos
    if (overdue !== undefined) {
      const shouldBeOverdue = overdue === "true";
      const now = new Date();

      todos = todos.filter((todo) => {
        if (!todo.due_date || todo.completed) return !shouldBeOverdue;
        const isOverdue = new Date(todo.due_date) < now;
        return isOverdue === shouldBeOverdue;
      });
      console.log(`[SEARCH] After overdue filter: ${todos.length} todos`);
    }

    // Ordenar resultados
    todos.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "created_at":
          aValue = new Date(a.created_at || a.createdAt);
          bValue = new Date(b.created_at || b.createdAt);
          break;
        case "updated_at":
          aValue = new Date(
            a.updated_at || a.updatedAt || a.created_at || a.createdAt
          );
          bValue = new Date(
            b.updated_at || b.updatedAt || b.created_at || b.createdAt
          );
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case "due_date":
          aValue = a.due_date ? new Date(a.due_date) : new Date("9999-12-31");
          bValue = b.due_date ? new Date(b.due_date) : new Date("9999-12-31");
          break;
        case "completed":
          aValue = a.completed ? 1 : 0;
          bValue = b.completed ? 1 : 0;
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Paginación
    const totalResults = todos.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTodos = todos.slice(startIndex, endIndex);

    // Formatear resultados
    const formattedTodos = paginatedTodos.map((todo) => ({
      ...todo,
      tags: todo.tags
        ? typeof todo.tags === "string"
          ? JSON.parse(todo.tags)
          : todo.tags
        : [],
      completed: Boolean(todo.completed),
    }));

    const responseData = {
      todos: formattedTodos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
        resultsPerPage: parseInt(limit),
        hasNext: endIndex < totalResults,
        hasPrev: page > 1,
      },
      searchInfo: {
        query: query || null,
        filtersApplied: {
          priority,
          category,
          completed,
          tags,
          dueDateFrom,
          dueDateTo,
          createdFrom,
          createdTo,
          hasDescription,
          hasDueDate,
          overdue,
        },
        sorting: {
          sortBy,
          sortOrder,
        },
      },
    };

    console.log(
      `[SEARCH] Search completed for user ${userId}: ${totalResults} results, returning page ${page} with ${formattedTodos.length} todos`
    );
    return sendResponse(
      res,
      createSuccessResponse(responseData, "Search completed successfully")
    );
  } catch (error) {
    return handleApiError(error, req, res);
  }
}

module.exports = async (req, res) => {
  console.log(`[SEARCH API] ${req.method} request received`);
  console.log("[SEARCH API] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[SEARCH API] Query:", JSON.stringify(req.query, null, 2));

  // Configurar headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[SEARCH API] CORS preflight request handled");
    res.status(200).end();
    return;
  }

  // Solo permitir GET
  if (req.method !== "GET") {
    console.warn(`[SEARCH API] Method ${req.method} not allowed`);
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
    console.error("[SEARCH API] Authentication failed:", error.message);
    return; // verifyToken ya envió la respuesta
  }

  // Manejar GET request
  try {
    return await advancedSearch(req, res);
  } catch (error) {
    return handleApiError(error, req, res);
  }
};
