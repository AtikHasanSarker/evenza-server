import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'evenza';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment configuration.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

const client = new MongoClient(MONGODB_URI);

async function startServer() {
  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);

    console.log(`Connected to MongoDB: ${MONGODB_DB_NAME}`);

    app.get('/', (req: Request, res: Response) => {
      res.send({ status: 'ok', message: 'Evenza backend is running.' });
    });

    app.locals.db = db;

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

startServer();
