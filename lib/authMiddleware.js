/**
 * Middleware de autenticación mejorado con manejo de errores
 */
const jwt = require("jsonwebtoken");
const { createErrorResponse, sendResponse } = require("../lib/apiHelpers");

function verifyToken(req, res, next) {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendResponse(
        res,
        createErrorResponse("No authorization header provided", 401)
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      return sendResponse(
        res,
        createErrorResponse(
          "Invalid authorization format. Use: Bearer <token>",
          401
        )
      );
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    if (!token) {
      return sendResponse(res, createErrorResponse("No token provided", 401));
    }

    // Verificar el JWT_SECRET
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error(
        "[AUTH MIDDLEWARE] JWT_SECRET environment variable is required"
      );
      return sendResponse(
        res,
        createErrorResponse("Server configuration error", 500)
      );
    }

    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Validar que el payload tenga la estructura esperada
    if (!decoded.userId || !decoded.email) {
      return sendResponse(
        res,
        createErrorResponse("Invalid token payload", 401)
      );
    }

    // Agregar información del usuario al request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    // Log de autenticación exitosa
    console.log(
      `[AUTH SUCCESS] User ${decoded.email} (ID: ${decoded.userId}) authenticated`
    );

    next();
  } catch (error) {
    console.error("[AUTH ERROR]:", error.message);

    // Manejar errores específicos de JWT
    if (error.name === "TokenExpiredError") {
      return sendResponse(res, createErrorResponse("Token has expired", 401));
    }

    if (error.name === "JsonWebTokenError") {
      return sendResponse(res, createErrorResponse("Invalid token", 401));
    }

    if (error.name === "NotBeforeError") {
      return sendResponse(
        res,
        createErrorResponse("Token not active yet", 401)
      );
    }

    // Error genérico
    return sendResponse(res, createErrorResponse("Authentication failed", 401));
  }
}

// Middleware opcional para verificar token (no falla si no hay token)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Si hay token, verificarlo
    return verifyToken(req, res, next);
  } else {
    // Si no hay token, continuar sin usuario
    req.user = null;
    next();
  }
}

module.exports = {
  verifyToken,
  optionalAuth,
};
