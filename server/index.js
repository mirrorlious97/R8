const express = require('express');
const geminiRouter = require('./routes/gemini');

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use('/api/gemini', geminiRouter);

app.use((_, res) => {
  res.status(404).json({
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Route not found.' },
  });
});

if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on ${port}`);
  });
}

module.exports = app;
