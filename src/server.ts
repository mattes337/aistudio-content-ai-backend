import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { initDatabase } from './config/database';
import { loadEnvConfig } from './utils/env';
import logger from './utils/logger';
import { specs } from './config/swagger';


// Import routes
import channelsRouter from './routes/channels';
import mediaAssetsRouter from './routes/media-assets';
import articlesRouter from './routes/articles';
import postsRouter from './routes/posts';
import knowledgeSourcesRouter from './routes/knowledge-sources';
import recipientsRouter from './routes/recipients';
import newslettersRouter from './routes/newsletters';
import aiRouter from './routes/ai';

const config = loadEnvConfig();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? ['https://your-domain.com'] // Replace with your production domain
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger UI documentation with dynamic base URL
app.use('/api-docs', swaggerUi.serve, (req, res, next) => {
  // Detect reverse proxy headers
  const forwardedProto = req.headers['x-forwarded-proto'] || req.headers['x-forwarded-protocol'];
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers['x-forwarded-server'] || req.get('host');
  
  let baseUrl;
  if (forwardedHost && forwardedProto) {
    // We're behind a reverse proxy
    baseUrl = `${forwardedProto}://${forwardedHost}`;
  } else {
    // Direct connection
    baseUrl = req.protocol + '://' + req.get('host');
  }
  
  // Create a copy of specs with replaced base URL
  const specsCopy = JSON.parse(JSON.stringify(specs));
  specsCopy.servers[0].url = baseUrl;
  
  // Use custom middleware to serve modified specs
  swaggerUi.setup(specsCopy, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Content AI Backend API Documentation'
  })(req, res, next);
});

// Raw OpenAPI JSON specification with dynamic base URL
app.get('/api-docs.json', (req, res) => {
  // Detect reverse proxy headers
  const forwardedProto = req.headers['x-forwarded-proto'] || req.headers['x-forwarded-protocol'];
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers['x-forwarded-server'] || req.get('host');
  
  let baseUrl;
  if (forwardedHost && forwardedProto) {
    // We're behind a reverse proxy
    baseUrl = `${forwardedProto}://${forwardedHost}`;
  } else {
    // Direct connection
    baseUrl = req.protocol + '://' + req.get('host');
  }
  
  let specString = JSON.stringify(specs);
  specString = specString.replace(/{request.baseUrl}/g, baseUrl);
  res.setHeader('Content-Type', 'application/json');
  res.send(specString);
});

// API routes
app.use('/api/channels', channelsRouter);
app.use('/api/media-assets', mediaAssetsRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/posts', postsRouter);
app.use('/api/knowledge-sources', knowledgeSourcesRouter);
app.use('/api/recipients', recipientsRouter);
app.use('/api/newsletters', newslettersRouter);
app.use('/api/ai', aiRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack })
  });
});

async function startServer() {
  try {
    // Initialize database connection
    await initDatabase();
    logger.info('Database initialized successfully');

    // Start the server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
