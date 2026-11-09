import express from 'express';
import path from 'path';
import { apiRouter } from './src/server/api';

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache-busting headers for API
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// API Router
app.use('/api', apiRouter);

// Serve static assets in production build
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to SPA index.html
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
