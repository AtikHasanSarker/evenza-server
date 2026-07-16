import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose-cjs";

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const uri = process.env.MONGODB_URI!;

// Middleware
app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req:Request, res:Response, next:Function) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

async function run() {
  try {
    // await client.connect();
    const db = client.db("evenza");
    console.log(
      `Successfully Connected to MongoDB: Evenza`,
    );

    const eventsCollection = db.collection("events");

    // Home Route
    app.get("/", (req: Request, res: Response) => {
      res.send("Server is running for Evenza!");
    });

    // ==========================
    // Create Event
    // ==========================
    app.post("/events", async (req: Request, res: Response) => {
      const eventData = req.body;

      const result = await eventsCollection.insertOne(eventData);

      const insertedEvent = await eventsCollection.findOne({
        _id: result.insertedId,
      });

      res.json({
        success: true,
        data: insertedEvent,
      });
    });
    // ==========================
    // Get All Events
    // ==========================
   app.get("/events", async (req: Request, res: Response) => {
     const page = Number(req.query.page) || 1;
     const limit = Number(req.query.limit) || 12;
     const search = req.query.search as string;
     const category = req.query.category as string;

     const query: any = {};

     if (search) {
       query.$or = [
         { title: { $regex: search, $options: "i" } },
         { description: { $regex: search, $options: "i" } },
         { location: { $regex: search, $options: "i" } },
         { venue: { $regex: search, $options: "i" } },
       ];
     }

     if (category) {
       query.category = category;
     }
     const total = await eventsCollection.countDocuments(query);
     const events = await eventsCollection
       .find(query)
       .skip((page - 1) * limit)
       .limit(limit)
       .toArray();

     res.json({
       success: true,
       data: events,
       pagination: {
         total,
         page,
         limit,
         pages: Math.ceil(total / limit),
       },
     });
   });

    // ==========================
    // Get Single Event
    // ==========================
    app.get("/events/:id", async (req: Request, res: Response) => {
      const id = req.params.id as string;
      const result = await eventsCollection.findOne({
        _id: new ObjectId(id),
      });

      res.json(result);
    });

    // ==========================
    // Update Event
    // ==========================
    app.patch("/events/:id", async (req: Request, res: Response) => {
      const id = req.params.id as string;
      const updatedDoc = {
        $set: req.body,
      };

      const result = await eventsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        updatedDoc,
      );

      res.json(result);
    });

    // ==========================
    // Delete Event
    // ==========================
    app.delete("/events/:id", async (req: Request, res: Response) => {
      const id = req.params.id as string;
      const result = await eventsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });
    // ==========================
    // Featured Events
    // ==========================
    app.get("/featured-events", async (req: Request, res: Response) => {
      const result = await eventsCollection.find({ featured: true }).toArray();

      res.json(result);
    });

    // ==========================
    // Event Categories
    // ==========================
    app.get("/categories", async (req: Request, res: Response) => {
      const result = await eventsCollection.distinct("category");
      res.json(result);
    });

    // ==========================
    // Search & Filter Events
    // ==========================
    app.get("/search-events", async (req: Request, res: Response) => {
      const { search, category } = req.query;

      const query: any = {};

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
          { venue: { $regex: search, $options: "i" } },
        ];
      }

      if (category) {
        query.category = category;
      }
      const result = await eventsCollection.find(query).toArray();
      res.json(result);
    });

    // ==========================
    // Events Pagination
    // ==========================
    app.get("/events-pagination", async (req: Request, res: Response) => {
      const page = parseInt(req.query.page as string);
      const limit = parseInt(req.query.limit as string) || 6;

      if (page) {
        const skip = (page - 1) * limit;
        const totalItems = await eventsCollection.countDocuments();
        const totalPages = Math.ceil(totalItems / limit);
        const result = await eventsCollection
          .find()
          .skip(skip)
          .limit(limit)
          .toArray();

        res.json({
          data: result,
          currentPage: page,
          totalPages,
          totalItems,
          limit,
        });
      } else {
        const result = await eventsCollection.find().toArray();
        res.json(result);
      }
    });

    // ==========================
    // Latest Events
    // ==========================
    app.get("/latest-events", async (req: Request, res: Response) => {
      const result = await eventsCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      res.json(result);
    });

    // ==========================
    // Upcoming Events
    // ==========================
    app.get("/upcoming-events", async (req: Request, res: Response) => {
      const today = new Date().toISOString().split("T")[0];
      const result = await eventsCollection
        .find({
          date: { $gte: today },
        })
        .sort({ date: 1 })
        .toArray();
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on ${port} port`);
});
