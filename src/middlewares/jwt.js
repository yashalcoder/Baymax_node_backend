import jwt from "jsonwebtoken";

// ============================================
// JWT CONFIG
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
const JWT_EXPIRE  = process.env.JWT_EXPIRE  || "1y";

// ============================================
// GENERATE TOKEN
// ============================================
const generateToken = (user) => {
  return jwt.sign(
    {
      id:    user?._id   || user?.id,
      email: user?.email,
      role:  user?.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

// ============================================
// EXTRACT TOKEN  (Bearer header or cookie)
// ============================================
function extractToken(req) {
  const authHeader  = req.headers?.authorization || req.headers?.Authorization;
  const bearerToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  const cookieToken = req.cookies?.token;
  return bearerToken || cookieToken || null;
}

// ============================================
// MIDDLEWARE: Verify JWT
// ============================================
const authMiddleware = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      status:  "error",
      message: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(403).json({
      status:  "error",
      message: "Invalid or expired token",
    });
  }
};

// backward-compat alias
const authenticateToken = authMiddleware;

export { generateToken, authenticateToken, authMiddleware };