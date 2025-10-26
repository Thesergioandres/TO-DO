const { getInMemoryDatabase } = require("../../lib/memoryDb");
const { verifyToken } = require("../../lib/authMiddleware");
const {
  createSuccessResponse,
  createErrorResponse,
  sendResponse,
  handleApiError,
  checkRateLimit,
} = require("../../lib/apiHelpers");

// GET: Exportar todos los datos del usuario
async function exportUserData(req, res) {
  try {
    // Rate limiting más restrictivo para exportación
    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    checkRateLimit(clientIP, 10, 60 * 60 * 1000); // 10 exports por hora

    const { userId } = req.user;
    const { format = "json" } = req.query;

    console.log(
      `[EXPORT] Exporting data for user: ${userId} in format: ${format}`
    );

    if (!["json", "csv"].includes(format)) {
      throw new Error('Format must be either "json" or "csv"');
    }

    const db = getInMemoryDatabase();

    // Obtener datos del usuario
    const user = db.getUserById(userId);
    if (!user) {
      return sendResponse(res, createErrorResponse("User not found", 404));
    }

    // Obtener todos los TODOs del usuario
    const todos = db.getTodosByUserId(userId);

    // Formatear TODOs para exportación
    const formattedTodos = todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority,
      category: todo.category,
      tags: todo.tags
        ? typeof todo.tags === "string"
          ? JSON.parse(todo.tags)
          : todo.tags
        : [],
      completed: Boolean(todo.completed),
      dueDate: todo.due_date || null,
      createdAt: todo.created_at || todo.createdAt,
      updatedAt:
        todo.updated_at || todo.updatedAt || todo.created_at || todo.createdAt,
    }));

    if (format === "json") {
      // Exportación en formato JSON
      const exportData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          userId: userId,
          userEmail: user.email,
          totalTodos: formattedTodos.length,
          completedTodos: formattedTodos.filter((t) => t.completed).length,
          pendingTodos: formattedTodos.filter((t) => !t.completed).length,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at || user.createdAt,
        },
        todos: formattedTodos,
      };

      console.log(
        `[EXPORT] JSON export completed for user ${userId}: ${formattedTodos.length} todos`
      );

      // Configurar headers para descarga
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="todos-export-${userId}-${new Date().toISOString().split("T")[0]}.json"`
      );

      return sendResponse(
        res,
        createSuccessResponse(exportData, "Data exported successfully")
      );
    } else if (format === "csv") {
      // Exportación en formato CSV
      const csvHeaders = [
        "ID",
        "Title",
        "Description",
        "Priority",
        "Category",
        "Tags",
        "Completed",
        "Due Date",
        "Created At",
        "Updated At",
      ];

      const csvRows = formattedTodos.map((todo) => [
        todo.id,
        `"${todo.title.replace(/"/g, '""')}"`, // Escapar comillas dobles
        `"${todo.description.replace(/"/g, '""')}"`,
        todo.priority,
        todo.category,
        `"${todo.tags.join(", ")}"`,
        todo.completed ? "Yes" : "No",
        todo.dueDate || "",
        todo.createdAt,
        todo.updatedAt,
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.join(",")),
      ].join("\n");

      console.log(
        `[EXPORT] CSV export completed for user ${userId}: ${formattedTodos.length} todos`
      );

      // Configurar headers para descarga CSV
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="todos-export-${userId}-${new Date().toISOString().split("T")[0]}.csv"`
      );

      return res.status(200).send(csvContent);
    }
  } catch (error) {
    return handleApiError(error, req, res);
  }
}

// POST: Importar datos del usuario
async function importUserData(req, res) {
  try {
    // Rate limiting muy restrictivo para importación
    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    checkRateLimit(clientIP, 5, 60 * 60 * 1000); // 5 imports por hora

    const { userId } = req.user;
    const { todos, replaceExisting = false } = req.body;

    console.log(
      `[IMPORT] Importing data for user: ${userId}, replace: ${replaceExisting}`
    );

    if (!Array.isArray(todos)) {
      throw new Error("todos must be an array");
    }

    if (todos.length > 1000) {
      throw new Error("Cannot import more than 1000 todos at once");
    }

    const db = getInMemoryDatabase();

    // Si replaceExisting es true, eliminar todos los TODOs existentes
    if (replaceExisting) {
      const existingTodos = db.getTodosByUserId(userId);
      for (const todo of existingTodos) {
        db.deleteTodo(todo.id);
      }
      console.log(
        `[IMPORT] Deleted ${existingTodos.length} existing todos for user ${userId}`
      );
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const [index, todoData] of todos.entries()) {
      try {
        // Validar estructura del TODO
        if (!todoData.title || typeof todoData.title !== "string") {
          errors.push(
            `Row ${index + 1}: Title is required and must be a string`
          );
          skippedCount++;
          continue;
        }

        // Validar prioridad
        const validPriorities = ["low", "medium", "high", "urgent"];
        if (todoData.priority && !validPriorities.includes(todoData.priority)) {
          errors.push(
            `Row ${index + 1}: Invalid priority "${todoData.priority}"`
          );
          skippedCount++;
          continue;
        }

        // Validar categoría
        const validCategories = [
          "personal",
          "work",
          "shopping",
          "health",
          "finance",
          "education",
        ];
        if (todoData.category && !validCategories.includes(todoData.category)) {
          errors.push(
            `Row ${index + 1}: Invalid category "${todoData.category}"`
          );
          skippedCount++;
          continue;
        }

        // Preparar datos del TODO
        const newTodoData = {
          title: todoData.title.trim(),
          description: todoData.description || null,
          priority: todoData.priority || "medium",
          category: todoData.category || "personal",
          tags: Array.isArray(todoData.tags) ? todoData.tags : [],
          due_date: todoData.dueDate || todoData.due_date || null,
          completed: Boolean(todoData.completed),
          userId: userId,
        };

        // Crear TODO
        const createdTodo = db.createTodo(newTodoData);
        importedCount++;
      } catch (error) {
        errors.push(`Row ${index + 1}: ${error.message}`);
        skippedCount++;
      }
    }

    const responseData = {
      summary: {
        totalProcessed: todos.length,
        imported: importedCount,
        skipped: skippedCount,
        hasErrors: errors.length > 0,
      },
      errors: errors.slice(0, 20), // Limitar errores a 20 para evitar respuestas muy grandes
      importedTodos: importedCount,
    };

    console.log(
      `[IMPORT] Import completed for user ${userId}: ${importedCount} imported, ${skippedCount} skipped`
    );

    if (errors.length > 0) {
      return sendResponse(
        res,
        createSuccessResponse(
          responseData,
          `Import completed with ${errors.length} errors`,
          206
        )
      );
    } else {
      return sendResponse(
        res,
        createSuccessResponse(
          responseData,
          "Import completed successfully",
          201
        )
      );
    }
  } catch (error) {
    return handleApiError(error, req, res);
  }
}

module.exports = async (req, res) => {
  console.log(`[EXPORT/IMPORT API] ${req.method} request received`);
  console.log(
    "[EXPORT/IMPORT API] Headers:",
    JSON.stringify(req.headers, null, 2)
  );
  console.log("[EXPORT/IMPORT API] Query:", JSON.stringify(req.query, null, 2));

  // Configurar headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[EXPORT/IMPORT API] CORS preflight request handled");
    res.status(200).end();
    return;
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
    console.error("[EXPORT/IMPORT API] Authentication failed:", error.message);
    return; // verifyToken ya envió la respuesta
  }

  // Manejar métodos HTTP
  try {
    switch (req.method) {
      case "GET":
        return await exportUserData(req, res);
      case "POST":
        return await importUserData(req, res);
      default:
        console.warn(`[EXPORT/IMPORT API] Method ${req.method} not allowed`);
        return sendResponse(
          res,
          createErrorResponse(`Method ${req.method} Not Allowed`, 405)
        );
    }
  } catch (error) {
    return handleApiError(error, req, res);
  }
};
