/**
 * Cloud Function to bulk upload documents to Pinecone
 * Uses BATCH embedding API for 10x faster processing
 */

const {onRequest} = require("firebase-functions/https");
const admin = require("firebase-admin");
const {Pinecone} = require("@pinecone-database/pinecone");
const {GoogleAuth} = require("google-auth-library");

const INDEX_NAME = "flutter-docs";
const DIMENSION = 768;
const BATCH_SIZE = 100; // Process 100 docs at a time
const EMBEDDING_BATCH_SIZE = 100; // Google API supports up to 250 texts per request

/**
 * Generate embeddings for MULTIPLE texts in a single API call (BATCH)
 * This is 10-50x faster than calling one at a time
 * @param {string[]} texts - Array of texts to embed
 * @return {Promise<number[][]>} - Array of embedding vectors
 */
async function generateBatchEmbeddings(texts) {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const authClient = await auth.getClient();
  const projectId = "hi-project-flutter-chatbot";
  const location = "us-central1";

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/text-embedding-004:predict`;

  // Prepare batch request - each text as an instance
  const instances = texts.map((text) => ({content: text}));

  const response = await authClient.request({
    url: url,
    method: "POST",
    data: {instances},
  });

  // Extract embeddings from response
  return response.data.predictions.map((pred) => pred.embeddings.values);
}

/**
 * Bulk upload Cloud Function with BATCH embedding
 * Call with POST: { startIndex: 0, batchSize: 100 }
 */
exports.bulkUploadToPinecone = onRequest(
    {
      cors: true,
      memory: "2GiB",
      timeoutSeconds: 540, // 9 minutes max
    },
    async (req, res) => {
      try {
        // Only allow POST
        if (req.method !== "POST") {
          return res.status(405).json({error: "Method not allowed"});
        }

        const {startIndex = 0, batchSize = BATCH_SIZE} = req.body;

        console.log(`📤 Starting BATCH upload from index ${startIndex}, batch size ${batchSize}`);

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

        console.log(`📚 Processing ${snapshot.size} documents with BATCH embedding...`);

        // Prepare all documents
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        }));

        // Process in embedding batches
        const allVectors = [];

        for (let i = 0; i < docs.length; i += EMBEDDING_BATCH_SIZE) {
          const batch = docs.slice(i, i + EMBEDDING_BATCH_SIZE);
          const texts = batch.map((d) => d.data.content || "");

          console.log(`🔄 Generating batch embeddings ${i + 1}-${i + batch.length} of ${docs.length}...`);

          try {
            const embeddings = await generateBatchEmbeddings(texts);

            // Create vectors with embeddings
            for (let j = 0; j < batch.length; j++) {
              const doc = batch[j];
              const data = doc.data;

              allVectors.push({
                id: data.id || doc.id,
                values: embeddings[j],
                metadata: {
                  content: (data.content || "").substring(0, 10000),
                  url: data.url || "",
                  title: data.title || "",
                  lastUpdated: data.lastUpdated || "",
                  section: data.metadata?.section || "",
                  type: data.contentType || data.metadata?.type || "guide",
                },
              });
            }

            console.log(`✅ Batch ${i + 1}-${i + batch.length} embeddings generated`);
          } catch (error) {
            console.error(`Error generating batch embeddings:`, error.message);
            // Try one by one as fallback for this batch
            for (const doc of batch) {
              try {
                const [embedding] = await generateBatchEmbeddings([doc.data.content || ""]);
                allVectors.push({
                  id: doc.data.id || doc.id,
                  values: embedding,
                  metadata: {
                    content: (doc.data.content || "").substring(0, 10000),
                    url: doc.data.url || "",
                    title: doc.data.title || "",
                    lastUpdated: doc.data.lastUpdated || "",
                    section: doc.data.metadata?.section || "",
                    type: doc.data.contentType || doc.data.metadata?.type || "guide",
                  },
                });
              } catch (e) {
                console.error(`Skipping doc ${doc.id}:`, e.message);
              }
            }
          }
        }

        // Upload to Pinecone in batches of 100
        if (allVectors.length > 0) {
          console.log(`📦 Uploading ${allVectors.length} vectors to Pinecone...`);

          for (let i = 0; i < allVectors.length; i += 100) {
            const uploadBatch = allVectors.slice(i, i + 100);
            await index.upsert(uploadBatch);
            console.log(`✅ Uploaded ${i + uploadBatch.length}/${allVectors.length} vectors`);
          }
        }

        const nextIndex = startIndex + batchSize;

        return res.json({
          success: true,
          processed: allVectors.length,
          startIndex,
          nextIndex,
          message: `Processed ${allVectors.length} documents. Next batch starts at ${nextIndex}`,
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
