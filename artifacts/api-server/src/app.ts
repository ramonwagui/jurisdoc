import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";

const app: Express = express();

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

const allowedOrigins = new Set(
  [
    process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "",
    ...(process.env.REPLIT_DOMAINS
      ? process.env.REPLIT_DOMAINS.split(",").map((d) => `https://${d.trim()}`)
      : []),
  ].filter(Boolean),
);

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
}));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

const AUTH_EXEMPT_PATHS = ["/api/healthz", "/api/auth"];
const STORAGE_EXEMPT = "/api/storage/public-objects";

function activeUserGuard(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  if (AUTH_EXEMPT_PATHS.some((p) => path.startsWith(p))) {
    next();
    return;
  }
  if (path.startsWith(STORAGE_EXEMPT)) {
    next();
    return;
  }

  if (!req.isAuthenticated()) {
    next();
    return;
  }

  if (req.appUser && !req.appUser.active) {
    res.status(403).json({ error: "Conta desativada. Contate o administrador." });
    return;
  }

  next();
}

app.use(activeUserGuard);

app.use("/api", router);

export default app;
