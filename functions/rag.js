const {VertexAI} = require("@google-cloud/vertexai");
const {Storage} = require("@google-cloud/storage");
const {
  generateLocalEmbedding,
  calculateCosineSimilarity: calculateLocalCosineSimilarity,
} = require("./localEmbeddings");

// Initialize Vertex AI and Storage
// Note: vertexAi is reserved for future direct usage
// eslint-disable-next-line no-unused-vars
const vertexAi = new VertexAI({
  project: "hi-project-flutter-chatbot",
  location: "us-central1",
});

const storage = new Storage();
const bucket = storage.bucket("hi-project-flutter-chatbot-vectors");

// FREE Vector Search Configuration
// Set to true to use FREE local EmbeddingGemma model
// Set to false to use paid Google text-embedding-004
const USE_FREE_LOCAL_EMBEDDINGS = true;

// Vector Search Index configuration
const INDEX_ID = "2259692108149424128";
const PROJECT_ID = "hi-project-flutter-chatbot";
const LOCATION = "us-central1";
const INDEX_ENDPOINT = `projects/${PROJECT_ID}/locations/${LOCATION}/indexes/${INDEX_ID}`;

// Index Endpoint ID (needed for deployed indexes)
// This needs to be created and the index deployed to it
// For now, we'll use null and fallback to keyword search
const INDEX_ENDPOINT_ID = null; // Set this when index is deployed to an endpoint

/**
 * Generate embeddings for text using either FREE local model or paid Google API
 * @param {string} text - Text to embed
 * @return {Promise<number[]>} - 768-dimensional embedding vector
 */
async function generateEmbedding(text) {
  // Use FREE local EmbeddingGemma model
  if (USE_FREE_LOCAL_EMBEDDINGS) {
    console.log("💰 Using FREE local EmbeddingGemma model");
    return await generateLocalEmbedding(text);
  }

  // Fallback to paid Google text-embedding-004 API
  try {
    console.log("💳 Using PAID Google text-embedding-004 API");
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
      console.log("Full API response:", JSON.stringify(response.data, null, 2));
      throw new Error("Unexpected API response structure");
    }
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Search Vector Index using Vertex AI Matching Engine
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {number} topK - Number of results to return
 * @return {Promise<Array>} - Array of matching documents
 */
async function searchVectorIndex(queryEmbedding, topK = 5) {
  try {
    // Check if index endpoint is configured
    if (!INDEX_ENDPOINT_ID) {
      console.log("Vector Search Index Endpoint not configured, using fallback");
      return null;
    }

    const {GoogleAuth} = require("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const authClient = await auth.getClient();
    const projectId = PROJECT_ID;
    const location = LOCATION;

    // Vertex AI Matching Engine endpoint - requires deployed index
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/indexEndpoints/${INDEX_ENDPOINT_ID}:findNeighbors`;

    const requestBody = {
      deployedIndexId: INDEX_ID,
      queries: [{
        datapoint: {
          datapointId: "query",
          featureVector: queryEmbedding,
        },
        neighborCount: topK,
      }],
      returnFullDatapoint: false,
    };

    console.log(`Calling Vector Search API at: ${endpoint}`);

    const response = await authClient.request({
      url: endpoint,
      method: "POST",
      data: requestBody,
    });

    if (!response.data || !response.data.nearestNeighbors || !response.data.nearestNeighbors[0]) {
      console.log("No results from Vector Search");
      return [];
    }

    const neighbors = response.data.nearestNeighbors[0].neighbors || [];
    console.log(`Vector Search found ${neighbors.length} neighbors`);

    // Fetch document metadata from Firestore using the IDs
    const admin = require("firebase-admin");
    const db = admin.firestore();

    const documents = [];
    for (const neighbor of neighbors) {
      const docId = neighbor.datapoint.datapointId;
      const distance = neighbor.distance || 0;
      const similarity = 1 - distance; // Convert distance to similarity

      try {
        const docRef = await db.collection("document_chunks").doc(docId).get();
        if (docRef.exists) {
          const data = docRef.data();
          documents.push({
            id: docId,
            content: data.content,
            url: data.url,
            lastUpdated: data.lastUpdated,
            similarity: similarity,
            metadata: {
              title: data.title || data.metadata?.title || "Flutter Documentation",
              section: data.metadata?.section || "General",
              type: data.contentType || data.metadata?.type || "guide",
            },
          });
        }
      } catch (error) {
        console.error(`Error fetching document ${docId}:`, error);
      }
    }

    return documents;
  } catch (error) {
    console.error("Vector Search API error:", error.message);
    // Return null to trigger fallback
    return null;
  }
}

/**
 * Add documents to vector index
 * @param {Array} documents - Array of {id, text, metadata} objects
 * @return {Promise<void>}
 */
async function addDocumentsToIndex(documents) {
  try {
    const embeddings = [];

    // Generate embeddings for all documents
    for (const doc of documents) {
      const embedding = await generateEmbedding(doc.text);
      embeddings.push({
        id: doc.id,
        embedding: embedding,
        restricts: [],
        allows: [],
        metadata: doc.metadata || {},
      });
    }

    // Create JSONL file for batch upload
    const jsonlContent = embeddings.map((item) => JSON.stringify(item)).join("\n");
    const timestamp = Date.now();
    const fileName = `batch_${timestamp}.jsonl`;

    // Upload to Cloud Storage
    const file = bucket.file(`updates/${fileName}`);
    await file.save(jsonlContent, {
      metadata: {
        contentType: "application/json",
      },
    });

    console.log(`Uploaded ${embeddings.length} embeddings to ${fileName}`);

    // Note: In production, you'd trigger index update here
    // For now, we'll handle updates manually

    return {
      success: true,
      fileName: fileName,
      count: embeddings.length,
    };
  } catch (error) {
    console.error("Error adding documents to index:", error);
    throw error;
  }
}

/**
 * Search for similar documents using FREE local vector embeddings
 * @param {string} query - Search query text
 * @param {number} topK - Number of results to return (default: 5)
 * @return {Promise<Array>} - Array of similar documents with scores
 */
async function findSimilarDocuments(query, topK = 5) {
  try {
    // Generate embedding for the query using FREE local model
    console.log(`🔍 Searching for: "${query}"`);
    const queryEmbedding = await generateEmbedding(query);
    console.log(`✅ Generated query embedding (${queryEmbedding.length} dimensions)`);

    // Try to use vector search first, fallback to Firestore if needed
    try {
      // Try actual Vector Search API first (if endpoint is configured)
      const vectorResults = await searchVectorIndex(queryEmbedding, topK);

      if (vectorResults && vectorResults.length > 0) {
        console.log(`Vector Search API returned ${vectorResults.length} results`);
        return vectorResults;
      }

      // Use FREE Firestore-based HYBRID search (vector + keyword fallback)
      console.log("💰 Using FREE Firestore-based HYBRID search (vector + keyword)");
      const admin = require("firebase-admin");
      const db = admin.firestore();

      // Get all document chunks
      const snapshot = await db.collection("document_chunks")
          .get();

      console.log(`📚 Total documents in Firestore: ${snapshot.size}`);

      if (snapshot.empty) {
        console.log("No documents found, returning empty results");
        return [];
      }

      const documents = [];
      let vectorCount = 0;
      let keywordCount = 0;

      // HYBRID SEARCH: Use vector similarity if embedding exists, else keyword matching
      for (const doc of snapshot.docs) {
        const data = doc.data();
        let similarity = 0;

        // Try vector similarity first (FREE semantic search)
        if (data.embedding && Array.isArray(data.embedding) && data.embedding.length === 768) {
          similarity = calculateCosineSimilarity(queryEmbedding, data.embedding);
          vectorCount++;
        } else {
          // Fallback to keyword matching for documents without embeddings
          const contentLower = (data.content || "").toLowerCase();
          const titleLower = (data.title || "").toLowerCase();
          const queryLower = query.toLowerCase();

          // Simple keyword scoring
          if (titleLower.includes(queryLower)) {
            similarity = 0.9;
          } else if (contentLower.includes(queryLower)) {
            similarity = 0.7;
          } else {
            // Check for individual terms
            const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);
            let termMatches = 0;
            for (const term of queryTerms) {
              if (titleLower.includes(term)) termMatches += 2;
              if (contentLower.includes(term)) termMatches += 1;
            }
            similarity = Math.min(termMatches * 0.15, 0.8);
          }
          keywordCount++;
        }

        documents.push({
          id: data.id || doc.id,
          content: data.content,
          url: data.url,
          lastUpdated: data.lastUpdated,
          similarity: similarity,
          metadata: {
            title: data.title || data.metadata?.title || "Flutter Documentation",
            section: data.metadata?.section || "General",
            type: data.contentType || data.metadata?.type || "guide",
          },
        });
      }

      console.log(`✅ Processed ${documents.length} documents`);
      console.log(`   🎯 Vector similarity: ${vectorCount} documents`);
      console.log(`   📝 Keyword matching: ${keywordCount} documents`);

      // Sort by similarity score (highest first) and return top K
      const sortedDocs = documents
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK);

      console.log(`🏆 Top ${sortedDocs.length} results:`);
      sortedDocs.forEach((doc, i) => {
        console.log(`  ${i + 1}. [${(doc.similarity * 100).toFixed(1)}%] ${doc.metadata.title}`);
        console.log(`     URL: ${doc.url}`);
      });

      return sortedDocs;
    } catch (vectorError) {
      console.error("Vector search error, using basic search:", vectorError);
      // Fallback to basic Firestore search
      return await basicFirestoreSearch(query, topK);
    }
  } catch (error) {
    console.error("Error searching documents:", error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Uses local implementation from localEmbeddings.js
 * @param {number[]} vectorA
 * @param {number[]} vectorB
 * @return {number} Similarity score between 0 and 1
 */
function calculateCosineSimilarity(vectorA, vectorB) {
  return calculateLocalCosineSimilarity(vectorA, vectorB);
}

/**
 * Basic Firestore search fallback
 * @param {string} query
 * @param {number} topK
 * @return {Promise<Array>}
 */
async function basicFirestoreSearch(query, topK) {
  const admin = require("firebase-admin");
  const db = admin.firestore();

  const snapshot = await db.collection("document_chunks")
      .orderBy("createdAt", "desc")
      .limit(topK)
      .get();

  const documents = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    documents.push({
      id: data.id,
      content: data.content,
      url: data.url,
      lastUpdated: data.lastUpdated,
      similarity: 0.7, // Default similarity for basic search
      metadata: {
        title: data.title || data.metadata?.title || "Flutter Documentation",
        section: data.metadata?.section || "General",
        type: data.contentType || data.metadata?.type || "guide",
      },
    });
  });

  return documents;
}

/**
 * Check if vector index is ready
 * @return {Promise<boolean>} - Whether index is ready for use
 */
async function isIndexReady() {
  // TODO: Implement actual index status check
  // For now, return false since index is still building
  return false;
}

module.exports = {
  generateEmbedding,
  addDocumentsToIndex,
  findSimilarDocuments,
  searchVectorIndex,
  isIndexReady,
  INDEX_ID,
  INDEX_ENDPOINT,
};
