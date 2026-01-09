/**
 * Cloud Function to bulk upload documents to Pinecone
 * This runs in Firebase environment with proper auth
 */

const {onRequest} = require("firebase-functions/https");
const admin = require("firebase-admin");
const {Pinecone} = require("@pinecone-database/pinecone");
const {GoogleAuth} = require("google-auth-library");

const INDEX_NAME = "flutter-docs";
const DIMENSION = 768;
const BATCH_SIZE = 20; // Process 20 docs at a time to avoid timeout

/**
 * Generate embedding using Google text-embedding-004 API
 */
async function generateGoogleEmbedding(text) {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const authClient = await auth.getClient();
  const projectId = "hi-project-flutter-chatbot";
  const location = "us-central1";

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/text-embedding-004:predict`;

  const response = await authClient.request({
    url: url,
    method: "POST",
    data: {
      instances: [{content: text}],
    },
  });

  return response.data.predictions[0].embeddings.values;
}

/**
 * Bulk upload Cloud Function
 * Call with POST: { startIndex: 0, batchSize: 20 }
 */
exports.bulkUploadToPinecone = onRequest(
    {
      cors: true,
      memory: "1GiB",
      timeoutSeconds: 540, // 9 minutes max
    },
    async (req, res) => {
      try {
        // Only allow POST
        if (req.method !== "POST") {
          return res.status(405).json({error: "Method not allowed"});
        }

        const {startIndex = 0, batchSize = BATCH_SIZE} = req.body;

        console.log(`📤 Starting bulk upload from index ${startIndex}, batch size ${batchSize}`);

        // Initialize Pinecone
        const functions = require("firebase-functions");
        const apiKey = process.env.PINECONE_API_KEY || functions.config().pinecone?.api_key;

        if (!apiKey) {
          throw new Error("Pinecone API key not configured");
        }

        const pinecone = new Pinecone({apiKey});

        // Ensure index exists
        const existingIndexes = await pinecone.listIndexes();
        const indexExists = existingIndexes.indexes?.some((idx) => idx.name === INDEX_NAME);

        if (!indexExists) {
          console.log("Creating Pinecone index...");
          await pinecone.createIndex({
            name: INDEX_NAME,
            dimension: DIMENSION,
            metric: "cosine",
            spec: {
              serverless: {
                cloud: "aws",
                region: "us-east-1",
              },
            },
          });
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        const index = pinecone.index(INDEX_NAME);

        // Get documents from Firestore
        const db = admin.firestore();
        const snapshot = await db
            .collection("document_chunks")
            .orderBy(admin.firestore.FieldPath.documentId())
            .offset(startIndex)
            .limit(batchSize)
            .get();

        if (snapshot.empty) {
          return res.json({
            success: true,
            message: "No more documents to process",
            processed: 0,
            startIndex,
          });
        }

        console.log(`📚 Processing ${snapshot.size} documents...`);

        // Generate embeddings and prepare vectors
        const vectors = [];
        let processed = 0;

        for (const doc of snapshot.docs) {
          const data = doc.data();

          try {
            console.log(`[${processed + 1}/${snapshot.size}] Generating embedding for: ${doc.id}`);

            const embedding = await generateGoogleEmbedding(data.content || "");

            vectors.push({
              id: data.id || doc.id,
              values: embedding,
              metadata: {
                content: (data.content || "").substring(0, 10000),
                url: data.url || "",
                title: data.title || "",
                lastUpdated: data.lastUpdated || "",
                section: data.metadata?.section || "",
                type: data.contentType || data.metadata?.type || "guide",
              },
            });

            processed++;
          } catch (error) {
            console.error(`Error processing doc ${doc.id}:`, error.message);
            // Continue with other documents
          }
        }

        // Upload to Pinecone
        if (vectors.length > 0) {
          console.log(`📦 Uploading ${vectors.length} vectors to Pinecone...`);
          await index.upsert(vectors);
          console.log("✅ Batch uploaded successfully");
        }

        const nextIndex = startIndex + batchSize;

        return res.json({
          success: true,
          processed: vectors.length,
          startIndex,
          nextIndex,
          message: `Processed ${vectors.length} documents. Next batch starts at ${nextIndex}`,
        });
      } catch (error) {
        console.error("❌ Bulk upload error:", error);
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    },
);
