import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { notFound, errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/users.routes.js";
import metaRoutes from "./routes/meta.routes.js";
import specialReferralRouter from "./routes/specialReferral.routes.js";

const app = express();

app.use(helmet());
app.use(cors('http://192.168.13.74:8000'));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/meta", metaRoutes);
app.use("/special-referrals", specialReferralRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
