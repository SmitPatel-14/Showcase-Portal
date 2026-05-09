import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.route.js';
import errorHandler from './utils/errorhandler.utils.js';
import projectRoutes from './routes/project.routes.js';
import cookieParser from "cookie-parser";
import CategoryRoutes  from './routes/categories.routes.js';


dotenv.config();

const app = express();
app.use(cookieParser());

app.use(cors({
    origin: process.env.BASE_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//database connection
connectDB();

//routes
app.use('/api/v1/auth',authRoutes);
app.use('/api/v1/projects',projectRoutes);
app.use('/api/v1/categories', CategoryRoutes);

// Error handling middleware
app.use(errorHandler);


export default app;
