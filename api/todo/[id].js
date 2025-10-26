const { getInMemoryDatabase } = require("../../lib/memoryDb");
const { verifyToken } = require("../../lib/authMiddleware");
const {
  createSuccessResponse,
  createErrorResponse,
  sendResponse,
  handleApiError,
  validateRequiredFields,
  validatePriority,
  validateCategory,
  validateDate,
  checkRateLimit,
} = require("../../lib/apiHelpers");

// GET: Obtener un TODO específico
async function getTodoById(req, res) {
  try {
    const { userId } = req.user;
    const { id } = req.query;

    console.log(`[TODO GET BY ID] Fetching todo ${id} for user: ${userId}`);

    if (!id) {
      throw new Error("Todo ID is required");
    }

    const db = getInMemoryDatabase();
    const todo = db.getTodoById(id);

    if (!todo) {
      return sendResponse(res, createErrorResponse("Todo not found", 404));
    }

    // Verificar que el TODO pertenece al usuario
    if (todo.user_id !== userId && todo.userId !== userId) {
      return sendResponse(
        res,
        createErrorResponse("Access denied to this todo", 403)
      );
    }

    // Formatear respuesta
    const formattedTodo = {
      ...todo,
      tags: todo.tags
        ? typeof todo.tags === "string"
          ? JSON.parse(todo.tags)
          : todo.tags
        : [],
      completed: Boolean(todo.completed),
    };

    console.log(`[TODO GET BY ID] Found todo ${id} for user ${userId}`);
    return sendResponse(
      res,
      createSuccessResponse(formattedTodo, "Todo retrieved successfully")
    );
  } catch (error) {
    return handleApiError(error, req, res);
  }
}

// PUT: Actualizar un TODO completo
async function updateTodo(req, res) {
  try {
    // Rate limiting
    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    checkRateLimit(clientIP, 30, 15 * 60 * 1000); // 30 updates por 15 minutos

    const { userId } = req.user;
    const { id } = req.query;
    const {
      title,
      description,
      priority,
      category,
      tags,
      due_date,
      completed,
    } = req.body;

    console.log(`[TODO UPDATE] Updating todo ${id} for user: ${userId}`);
    console.log(`[TODO UPDATE] Data:`, {
      title,
      description,
      priority,
      category,
      tags,
      due_date,
      completed,
    });

    if (!id) {
      throw new Error("Todo ID is required");
    }

    const db = getInMemoryDatabase();
    const existingTodo = db.getTodoById(id);

    if (!existingTodo) {
      return sendResponse(res, createErrorResponse("Todo not found", 404));
    }

    // Verificar que el TODO pertenece al usuario
    if (existingTodo.user_id !== userId && existingTodo.userId !== userId) {
      return sendResponse(
        res,
        createErrorResponse("Access denied to this todo", 403)
      );
    }

    // Validar campos requeridos
    validateRequiredFields(req.body, ["title"]);

    // Validaciones específicas
    if (title.trim().length < 1) {
      throw new Error("Title cannot be empty");
    }

    if (title.length > 200) {
      throw new Error("Title must be less than 200 characters");
    }

    if (description && description.length > 1000) {
      throw new Error("Description must be less than 1000 characters");
    }

    validatePriority(priority);
    validateCategory(category);

    if (due_date) {
      validateDate(due_date);
    }

    // Validar tags
    if (tags && !Array.isArray(tags)) {
      throw new Error("Tags must be an array");
    }

    if (tags && tags.length > 10) {
      throw new Error("Maximum 10 tags allowed");
    }

    if (tags) {
      for (const tag of tags) {
        if (typeof tag !== "string" || tag.length > 20) {
          throw new Error(
            "Each tag must be a string with maximum 20 characters"
          );
        }
      }
    }

    // Actualizar TODO
    const updateData = {
      title: title.trim(),
      description: description ? description.trim() : null,
      priority: priority || existingTodo.priority,
      category: category || existingTodo.category,
      tags: tags ? JSON.stringify(tags) : existingTodo.tags,
      due_date: due_date !== undefined ? due_date : existingTodo.due_date,
      completed:
        completed !== undefined ? Boolean(completed) : existingTodo.completed,
      updated_at: new Date().toISOString(),
    };

    const updatedTodo = db.updateTodo(id, updateData);
    console.log(`[TODO UPDATE] Updated todo ${id} for user ${userId}`);

    // Formatear respuesta
    const formattedTodo = {
      ...updatedTodo,
      tags: updatedTodo.tags
        ? typeof updatedTodo.tags === "string"
          ? JSON.parse(updatedTodo.tags)
          : updatedTodo.tags
        : [],
      completed: Boolean(updatedTodo.completed),
    };

    return sendResponse(
      res,
      createSuccessResponse(formattedTodo, "Todo updated successfully")
    );
  } catch (error) {
    return handleApiError(error, req, res);
  }
}

// PATCH: Actualizar campos específicos del TODO
async function patchTodo(req, res) {
  try {
    // Rate limiting
    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    checkRateLimit(clientIP, 50, 15 * 60 * 1000); // 50 patches por 15 minutos

    const { userId } = req.user;
    const { id } = req.query;

    console.log(`[TODO PATCH] Patching todo ${id} for user: ${userId}`);
    console.log(`[TODO PATCH] Data:`, req.body);

    if (!id) {
      throw new Error("Todo ID is required");
    }

    const db = getInMemoryDatabase();
    const existingTodo = db.getTodoById(id);

    if (!existingTodo) {
      return sendResponse(res, createErrorResponse("Todo not found", 404));
    }

    // Verificar que el TODO pertenece al usuario
    if (existingTodo.user_id !== userId && existingTodo.userId !== userId) {
      return sendResponse(
        res,
        createErrorResponse("Access denied to this todo", 403)
      );
    }

    // Preparar datos de actualización solo con campos proporcionados
    const updateData = { updated_at: new Date().toISOString() };

    // Validar y agregar campos proporcionados
    if (req.body.title !== undefined) {
      if (!req.body.title || req.body.title.trim().length < 1) {
        throw new Error("Title cannot be empty");
      }
      if (req.body.title.length > 200) {
        throw new Error("Title must be less than 200 characters");
      }
      updateData.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      if (req.body.description && req.body.description.length > 1000) {
        throw new Error("Description must be less than 1000 characters");
      }
      updateData.description = req.body.description
        ? req.body.description.trim()
        : null;
    }

    if (req.body.priority !== undefined) {
      validatePriority(req.body.priority);
      updateData.priority = req.body.priority;
    }

    if (req.body.category !== undefined) {
      validateCategory(req.body.category);
      updateData.category = req.body.category;
    }

    if (req.body.due_date !== undefined) {
      if (req.body.due_date) {
        validateDate(req.body.due_date);
      }
      updateData.due_date = req.body.due_date;
    }

    if (req.body.tags !== undefined) {
      if (!Array.isArray(req.body.tags)) {
        throw new Error("Tags must be an array");
      }
      if (req.body.tags.length > 10) {
        throw new Error("Maximum 10 tags allowed");
      }
      for (const tag of req.body.tags) {
        if (typeof tag !== "string" || tag.length > 20) {
          throw new Error(
            "Each tag must be a string with maximum 20 characters"
          );
        }
      }
      updateData.tags = JSON.stringify(req.body.tags);
    }

    if (req.body.completed !== undefined) {
      updateData.completed = Boolean(req.body.completed);
    }

    // Actualizar TODO
    const updatedTodo = db.updateTodo(id, updateData);
    console.log(`[TODO PATCH] Patched todo ${id} for user ${userId}`);

    // Formatear respuesta
    const formattedTodo = {
      ...updatedTodo,
      tags: updatedTodo.tags
        ? typeof updatedTodo.tags === "string"
          ? JSON.parse(updatedTodo.tags)
          : updatedTodo.tags
        : [],
      completed: Boolean(updatedTodo.completed),
    };

    return sendResponse(
      res,
      createSuccessResponse(formattedTodo, "Todo updated successfully")
    );
  } catch (error) {
    return handleApiError(error, req, res);
  }
}

// DELETE: Eliminar un TODO
async function deleteTodo(req, res) {
  try {
    // Rate limiting
    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    checkRateLimit(clientIP, 20, 15 * 60 * 1000); // 20 deletes por 15 minutos

    const { userId } = req.user;
    const { id } = req.query;

    console.log(`[TODO DELETE] Deleting todo ${id} for user: ${userId}`);

    if (!id) {
      throw new Error("Todo ID is required");
    }

    const db = getInMemoryDatabase();
    const existingTodo = db.getTodoById(id);

    if (!existingTodo) {
      return sendResponse(res, createErrorResponse("Todo not found", 404));
    }

    // Verificar que el TODO pertenece al usuario
    if (existingTodo.user_id !== userId && existingTodo.userId !== userId) {
      return sendResponse(
        res,
        createErrorResponse("Access denied to this todo", 403)
      );
    }

    // Eliminar TODO
    const deleted = db.deleteTodo(id);

    if (!deleted) {
      return sendResponse(
        res,
        createErrorResponse("Failed to delete todo", 500)
      );
    }

    console.log(`[TODO DELETE] Deleted todo ${id} for user ${userId}`);
    return sendResponse(
      res,
      createSuccessResponse({ id }, "Todo deleted successfully")
    );
  } catch (error) {
    return handleApiError(error, req, res);
  }
}

module.exports = async (req, res) => {
  console.log(
    `[TODO ID API] ${req.method} request received for todo: ${req.query.id}`
  );
  console.log("[TODO ID API] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[TODO ID API] Query:", JSON.stringify(req.query, null, 2));
  console.log("[TODO ID API] Body:", JSON.stringify(req.body, null, 2));

  // Configurar headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[TODO ID API] CORS preflight request handled");
    res.status(200).end();
    return;
  }

  // Verificar autenticación para todos los métodos excepto OPTIONS
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (error) {
    console.error("[TODO ID API] Authentication failed:", error.message);
    return; // verifyToken ya envió la respuesta
  }

  // Manejar métodos HTTP
  try {
    switch (req.method) {
      case "GET":
        return await getTodoById(req, res);
      case "PUT":
        return await updateTodo(req, res);
      case "PATCH":
        return await patchTodo(req, res);
      case "DELETE":
        return await deleteTodo(req, res);
      default:
        console.warn(`[TODO ID API] Method ${req.method} not allowed`);
        return sendResponse(
          res,
          createErrorResponse(`Method ${req.method} Not Allowed`, 405)
        );
    }
  } catch (error) {
    return handleApiError(error, req, res);
  }
};
