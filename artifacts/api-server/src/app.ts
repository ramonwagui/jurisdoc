import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { ObjectStorageService } from "./lib/objectStorage";

const app: Express = express();

const ROOT_DIR = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

console.log("=== APP.TS LOADED ===");

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

const allowedOrigins = new Set(
  [
    process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "",
    ...(process.env.REPLIT_DOMAINS
      ? process.env.REPLIT_DOMAINS.split(",").map((d) => `https://${d.trim()}`)
      : []),
  ].filter(Boolean),
);

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

const AUTH_EXEMPT_PATHS = [
  "/api/healthz",
  "/api/auth",
  "/api/processos/consultar",
  "/api/storage/test-r2",
];
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
    res
      .status(403)
      .json({ error: "Conta desativada. Contate o administrador." });
    return;
  }

  next();
}

app.use(activeUserGuard);

app.get("/api/test-simple", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Test simple works!" });
});

app.get("/api/storage/test-r2", async (_req: Request, res: Response) => {
  try {
    const storageService = new ObjectStorageService();
    const testBuffer = Buffer.from("R2 test successful!");
    const { objectPath } = await storageService.uploadObjectEntity(
      testBuffer,
      "text/plain",
    );
    res.json({ success: true, path: objectPath });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("R2 Test Error:", err);
    res.status(500).json({ success: false, error });
  }
});

app.use("/api", router);

app.use(express.static(PUBLIC_DIR));

app.get(/.*/, (_req: Request, res: Response) => {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  res.sendFile(indexPath);
});

export default app;
