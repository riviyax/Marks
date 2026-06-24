import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectDB } from './utils/db.js';
import { initFirebaseAdmin } from './utils/firebaseAdmin.js';

import usersRouter from './routes/users.js';
import ordersRouter from './routes/orders.js';
import paypalRouter from './routes/paypal.js';
import downloadsRouter from './routes/downloads.js';
import adminRouter from './routes/admin.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/paypal', paypalRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/admin', adminRouter);

// Note: there is intentionally no express.static() pointed at the receipts
// directory or the bot package directory. Both are only ever reachable
// through authenticated, ownership-checked routes above.

app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  initFirebaseAdmin();
  await connectDB();
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
