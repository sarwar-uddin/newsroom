import express from 'express';

const app = express();

const port = Number(process.env.API_PORT ?? 4000);

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'newsroom-api',
  });
});

app.listen(port, () => {
  console.log(`Newsroom API listening on http://localhost:${port}`);
});
