const {Pinecone} = require("@pinecone-database/pinecone");
const {generateLocalEmbedding} = require("./localEmbeddings");

/**
 * ARCHITECTURE NOTES:
 *
 * - For SEARCH queries (Cloud Functions): Uses Google text-embedding-004 API
 *   - Low memory overhead (~10MB)
 *   - Fast and reliable
 *   - Minimal cost per query
 *
 * - For UPLOAD (local script only): Uses FREE EmbeddingGemma model
 *   - Requires ~200MB memory (too much for Cloud Functions)
 *   - One-time operation run locally
 *   - See uploadToPinecone.js for upload script
 */

// Initialize Pinecone client
let pinecone = null;
let index = null;

const INDEX_NAME = "flutter-docs";
const DIMENSION = 768; // EmbeddingGemma output dimension

/**
 * Initialize Pinecone connection
 * @return {Promise<void>}
 */
async function initPinecone() {
  if (pinecone && index) {
    return index;
  }

  try {
    // Try to get API key from Firebase functions config or environment
    const functions = require("firebase-functions");
    const apiKey = process.env.PINECONE_API_KEY || functions.config().pinecone?.api_key;

    if (!apiKey) {
      throw new Error("PINECONE_API_KEY not found in config or environment variables");
    }

    console.log("🔌 Initializing Pinecone connection...");

    pinecone = new Pinecone({
      apiKey: apiKey,
    });

    // Check if index exists, create if not
    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some((idx) => idx.name === INDEX_NAME);

    if (!indexExists) {
      console.log(`📦 Creating Pinecone index: ${INDEX_NAME}...`);
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
      console.log(`✅ Index ${INDEX_NAME} created successfully`);

      // Wait for index to be ready
      console.log("⏳ Waiting for index to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Get index
    index = pinecone.index(INDEX_NAME);

    console.log("✅ Pinecone connected successfully");

    return index;
  } catch (error) {
    console.error("❌ Failed to initialize Pinecone:", error);
    throw error;
  }
}

/**
 * Generate embedding using Google text-embedding-004 API
 * @param {string} text - Text to embed
 * @return {Promise<number[]>} - 768-dimensional embedding vector
 */
async function generateGoogleEmbedding(text) {
  try {
    const {GoogleAuth} = require("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const authClient = await auth.getClient();
    const projectId = "hi-project-flutter-chatbot";
    const location = "us-central1";

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/text-embedding-004:predict`;

    const requestBody = {
      instances: [{
        content: text,
      }],
    };

    const response = await authClient.request({
      url: url,
      method: "POST",
      data: requestBody,
    });

    if (response.data.predictions && response.data.predictions[0]) {
      return response.data.predictions[0].embeddings.values;
    } else {
      throw new Error("Unexpected API response structure");
    }
  } catch (error) {
    console.error("Error generating Google embedding:", error);
    throw error;
  }
}

/**
 * Search for similar documents using Pinecone vector search
 * @param {string} query - Search query text
 * @param {number} topK - Number of results to return (default: 5)
 * @return {Promise<Array>} - Array of similar documents with scores
 */
async function searchPinecone(query, topK = 5) {
  try {
    console.log(`🔍 Searching Pinecone for: "${query}"`);

    // Generate embedding for the query using Google API (low memory overhead)
    console.log("💳 Using Google text-embedding-004 for query embedding");
    const queryEmbedding = await generateGoogleEmbedding(query);
    console.log(`✅ Generated query embedding (${queryEmbedding.length} dimensions)`);

    // Initialize Pinecone
    const idx = await initPinecone();

    // Search in Pinecone (NO MEMORY OVERHEAD - runs on Pinecone servers)
    console.log("🚀 Querying Pinecone vector database...");
    const results = await idx.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
    });

    console.log(`✅ Pinecone returned ${results.matches.length} results`);

    // Transform Pinecone results to our format
    const documents = results.matches.map((match, i) => {
      console.log(`  ${i + 1}. [${(match.score * 100).toFixed(1)}%] ${match.metadata?.title || match.id}`);

      return {
        id: match.id,
        content: match.metadata?.content || "",
        url: match.metadata?.url || "",
        lastUpdated: match.metadata?.lastUpdated || "",
        similarity: match.score,
        metadata: {
          title: match.metadata?.title || "Flutter Documentation",
          section: match.metadata?.section || "General",
          type: match.metadata?.type || "guide",
        },
      };
    });

    console.log(`🎯 Returning ${documents.length} documents from Pinecone`);

    return documents;
  } catch (error) {
    console.error("❌ Pinecone search error:", error);
    // Return null to trigger fallback to keyword search
    return null;
  }
}

/**
 * Upload documents to Pinecone (batch operation)
 * @param {Array} documents - Array of {id, content, metadata} objects
 * @return {Promise<Object>} - Upload result
 */
async function uploadToPinecone(documents) {
  try {
    console.log(`📤 Uploading ${documents.length} documents to Pinecone...`);

    // Initialize Pinecone
    const idx = await initPinecone();

    // Generate embeddings for all documents using FREE local model
    const vectors = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      console.log(`Generating embedding ${i + 1}/${documents.length}: ${doc.id}`);

      const embedding = await generateLocalEmbedding(doc.content);

      vectors.push({
        id: doc.id,
        values: embedding,
        metadata: {
          content: doc.content.substring(0, 10000), // Pinecone metadata limit
          url: doc.url || "",
          title: doc.title || "",
          lastUpdated: doc.lastUpdated || "",
          section: doc.metadata?.section || "",
          type: doc.metadata?.type || "guide",
        },
      });

      // Upload in batches of 100 to avoid timeouts
      if (vectors.length >= 100 || i === documents.length - 1) {
        console.log(`📦 Uploading batch of ${vectors.length} vectors...`);
        await idx.upsert(vectors);
        console.log(`✅ Batch uploaded successfully`);
        vectors.length = 0; // Clear the batch
      }
    }

    console.log(`✅ Successfully uploaded ${documents.length} documents to Pinecone`);

    return {
      success: true,
      count: documents.length,
    };
  } catch (error) {
    console.error("❌ Error uploading to Pinecone:", error);
    throw error;
  }
}

/**
 * Check if Pinecone is configured and available
 * @return {boolean} - Whether Pinecone is ready to use
 */
function isPineconeConfigured() {
  return !!process.env.PINECONE_API_KEY;
}

module.exports = {
  searchPinecone,
  uploadToPinecone,
  isPineconeConfigured,
  initPinecone,
};
