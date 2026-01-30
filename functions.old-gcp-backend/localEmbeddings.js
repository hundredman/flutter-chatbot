const {pipeline, env} = require("@huggingface/transformers");

// Configure environment for Node.js
env.allowLocalModels = false; // Use remote models
env.useBrowserCache = false; // Don't use browser cache in Node.js

// Global pipeline instance (singleton pattern for performance)
let embeddingPipeline = null;
let isInitializing = false;
let initPromise = null;

/**
 * Initialize the EmbeddingGemma model
 * Uses singleton pattern to avoid multiple model loads
 * @return {Promise} Pipeline instance
 */
async function initEmbeddingPipeline() {
  // If already initialized, return immediately
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  // If currently initializing, wait for it
  if (isInitializing) {
    return initPromise;
  }

  // Start initialization
  isInitializing = true;
  console.log("🚀 Initializing EmbeddingGemma model (this may take a moment on first run)...");

  try {
    initPromise = pipeline(
        "feature-extraction",
        "onnx-community/embeddinggemma-300m-ONNX",
        {
          quantized: true, // Use quantized version for lower memory (q8)
          progress_callback: (progress) => {
            if (progress.status === "downloading") {
              console.log(`⬇️  Downloading model: ${progress.file} - ${Math.round(progress.progress)}%`);
            } else if (progress.status === "loading") {
              console.log(`📦 Loading model: ${progress.file}`);
            }
          },
        },
    );

    embeddingPipeline = await initPromise;
    console.log("✅ EmbeddingGemma model initialized successfully!");
    console.log("   - Model: onnx-community/embeddinggemma-300m-ONNX (quantized)");
    console.log("   - Output dimensions: 768");
    console.log("   - Memory footprint: ~200MB");

    return embeddingPipeline;
  } catch (error) {
    console.error("❌ Failed to initialize EmbeddingGemma model:", error);
    embeddingPipeline = null;
    throw error;
  } finally {
    isInitializing = false;
    initPromise = null;
  }
}

/**
 * Generate embeddings for text using local EmbeddingGemma model
 * FREE alternative to Google's text-embedding-004
 * @param {string} text - Text to embed
 * @return {Promise<number[]>} - 768-dimensional embedding vector
 */
async function generateLocalEmbedding(text) {
  try {
    // Ensure pipeline is initialized
    const pipeline = await initEmbeddingPipeline();

    // Generate embedding
    const output = await pipeline(text, {
      pooling: "mean", // Mean pooling for sentence embeddings
      normalize: true, // L2 normalization for cosine similarity
    });

    // Convert tensor to array
    const embedding = Array.from(output.data);

    console.log(`Generated embedding for text: "${text.substring(0, 50)}..." (${embedding.length} dimensions)`);

    return embedding;
  } catch (error) {
    console.error("Error generating local embedding:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateLocalEmbedding multiple times
 * @param {string[]} texts - Array of texts to embed
 * @return {Promise<number[][]>} - Array of 768-dimensional embedding vectors
 */
async function generateBatchEmbeddings(texts) {
  try {
    const pipeline = await initEmbeddingPipeline();

    console.log(`Generating embeddings for ${texts.length} texts in batch...`);

    // Process in batch for efficiency
    const output = await pipeline(texts, {
      pooling: "mean",
      normalize: true,
    });

    // Convert to array of arrays
    const embeddings = [];
    const dimensions = 768;

    for (let i = 0; i < texts.length; i++) {
      const start = i * dimensions;
      const end = start + dimensions;
      embeddings.push(Array.from(output.data.slice(start, end)));
    }

    console.log(`✅ Generated ${embeddings.length} embeddings in batch`);

    return embeddings;
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
    throw new Error(`Failed to generate batch embeddings: ${error.message}`);
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * @param {number[]} vectorA - First embedding vector
 * @param {number[]} vectorB - Second embedding vector
 * @return {number} - Similarity score between 0 and 1
 */
function calculateCosineSimilarity(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have the same dimensions");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Get model info
 * @return {Object} Model information
 */
function getModelInfo() {
  return {
    name: "EmbeddingGemma 300M (ONNX)",
    provider: "Google DeepMind (via Hugging Face)",
    parameters: "308M",
    dimensions: 768,
    maxTokens: 2048,
    languages: "100+ (multilingual)",
    quantization: "q8 (8-bit)",
    memoryFootprint: "~200MB",
    cost: "FREE (local execution)",
    initialized: embeddingPipeline !== null,
  };
}

module.exports = {
  generateLocalEmbedding,
  generateBatchEmbeddings,
  calculateCosineSimilarity,
  initEmbeddingPipeline,
  getModelInfo,
};
