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

function buildErrorResponse(error) {
  const statusCode = error.statusCode || 500;
  const message =
    statusCode === 500 ? "Internal server error" : error.message || "Error";

  return createErrorResponse(message, statusCode, error.details || null);
}

// Middleware para manejo de errores consistente
function handleApiError(error, req, res) {
  console.error(`[API ERROR] ${req.method} ${req.url}:`, error.message);
  console.error("[API ERROR] Stack:", error.stack);

  // Errores con statusCode explícito
  if (error.statusCode) {
    return sendResponse(res, buildErrorResponse(error));
  }

  // Errores de validación
  if (error.name === "ValidationError") {
    error.statusCode = 400;
    return sendResponse(res, buildErrorResponse(error));
  }

  // Errores de rate limiting
  if (error.name === "RateLimitError") {
    error.statusCode = 429;
    return sendResponse(res, buildErrorResponse(error));
  }

  // Errores de autenticación
  if (
    error.message &&
    (error.message.includes("token") || error.message.includes("auth"))
  ) {
    return sendResponse(res, createErrorResponse("Authentication failed", 401));
  }

  // Errores de autorización
  if (
    error.message &&
    (error.message.includes("permission") || error.message.includes("access"))
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
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.name = "ValidationError";
    error.statusCode = 400;
    throw error;
  }
}

// Validador de email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const error = new Error("Invalid email format");
    error.name = "ValidationError";
    error.statusCode = 400;
    throw error;
  }
}

// Validador de prioridad
function validatePriority(priority) {
  const validPriorities = ["low", "medium", "high", "urgent"];
  if (priority && !validPriorities.includes(priority)) {
    const error = new Error(
      `Priority must be one of: ${validPriorities.join(", ")}`
    );
    error.name = "ValidationError";
    error.statusCode = 400;
    throw error;
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
    const error = new Error(
      `Category must be one of: ${validCategories.join(", ")}`
    );
    error.name = "ValidationError";
    error.statusCode = 400;
    throw error;
  }
}

// Validador de fecha
function validateDate(dateString) {
  if (dateString && isNaN(Date.parse(dateString))) {
    const error = new Error(
      "Invalid date format. Use ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ)"
    );
    error.name = "ValidationError";
    error.statusCode = 400;
    throw error;
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
    const error = new Error("Rate limit exceeded. Please try again later.");
    error.name = "RateLimitError";
    error.statusCode = 429;
    throw error;
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
