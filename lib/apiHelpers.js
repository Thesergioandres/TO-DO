/**
 * Helper para respuestas API estandarizadas
 * Asegura consistencia en todas las respuestas
 */

function createSuccessResponse(data, message = "Success", statusCode = 200) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    statusCode,
  };
}

function createErrorResponse(
  message = "Internal server error",
  statusCode = 500,
  details = null
) {
  return {
    success: false,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };
}

function sendResponse(res, response) {
  return res.status(response.statusCode).json(response);
}

// Middleware para manejo de errores consistente
function handleApiError(error, req, res) {
  console.error(`[API ERROR] ${req.method} ${req.url}:`, error.message);
  console.error("[API ERROR] Stack:", error.stack);

  // Errores de validación
  if (error.name === "ValidationError") {
    return sendResponse(res, createErrorResponse(error.message, 400));
  }

  // Errores de autenticación
  if (error.message.includes("token") || error.message.includes("auth")) {
    return sendResponse(res, createErrorResponse("Authentication failed", 401));
  }

  // Errores de autorización
  if (
    error.message.includes("permission") ||
    error.message.includes("access")
  ) {
    return sendResponse(res, createErrorResponse("Access denied", 403));
  }

  // Error genérico del servidor
  return sendResponse(res, createErrorResponse("Internal server error", 500));
}

// Validador de campos comunes
function validateRequiredFields(body, requiredFields) {
  const missing = [];

  for (const field of requiredFields) {
    if (
      !body[field] ||
      (typeof body[field] === "string" && !body[field].trim())
    ) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}

// Validador de email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
}

// Validador de prioridad
function validatePriority(priority) {
  const validPriorities = ["low", "medium", "high", "urgent"];
  if (priority && !validPriorities.includes(priority)) {
    throw new Error(`Priority must be one of: ${validPriorities.join(", ")}`);
  }
}

// Validador de categoría
function validateCategory(category) {
  const validCategories = [
    "personal",
    "work",
    "shopping",
    "health",
    "finance",
    "education",
  ];
  if (category && !validCategories.includes(category)) {
    throw new Error(`Category must be one of: ${validCategories.join(", ")}`);
  }
}

// Validador de fecha
function validateDate(dateString) {
  if (dateString && isNaN(Date.parse(dateString))) {
    throw new Error(
      "Invalid date format. Use ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ)"
    );
  }
}

// Rate limiting simple (en memoria)
const rateLimitStore = new Map();

function checkRateLimit(ip, limit = 100, window = 15 * 60 * 1000) {
  // 100 requests per 15 minutes
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / window)}`;

  const current = rateLimitStore.get(key) || 0;

  if (current >= limit) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  rateLimitStore.set(key, current + 1);

  // Cleanup old entries
  for (const [storeKey] of rateLimitStore) {
    if (storeKey < key) {
      rateLimitStore.delete(storeKey);
    }
  }
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  sendResponse,
  handleApiError,
  validateRequiredFields,
  validateEmail,
  validatePriority,
  validateCategory,
  validateDate,
  checkRateLimit,
};
