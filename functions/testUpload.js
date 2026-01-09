/**
 * Test script to upload a small sample to Pinecone
 * This tests the embedding generation and upload process
 */

require("dotenv").config();
const {Pinecone} = require("@pinecone-database/pinecone");
const {generateLocalEmbedding} = require("./localEmbeddings");

const INDEX_NAME = "flutter-docs";
const DIMENSION = 768;

async function testUpload() {
  try {
    console.log("🚀 Testing Pinecone upload with sample documents...\n");

    // Check API key
    if (!process.env.PINECONE_API_KEY) {
      console.error("❌ ERROR: PINECONE_API_KEY not set in .env file");
      process.exit(1);
    }

    // Initialize Pinecone
    console.log("🔌 Connecting to Pinecone...");
    const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY});

    // Check if index exists
    console.log("📋 Checking index...");
    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some((idx) => idx.name === INDEX_NAME);

    if (!indexExists) {
      console.log(`📝 Creating index: ${INDEX_NAME}`);
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
      console.log("⏳ Waiting for index to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    const index = pinecone.index(INDEX_NAME);

    // Sample documents to test
    const sampleDocs = [
      {
        id: "test-001",
        content: "Flutter is Google's UI toolkit for building natively compiled applications for mobile, web, and desktop from a single codebase.",
        title: "What is Flutter?",
        url: "https://flutter.dev",
      },
      {
        id: "test-002",
        content: "To implement authentication in Flutter, you can use the firebase_auth package which provides methods for email/password, Google Sign-In, and other authentication providers.",
        title: "Flutter Authentication",
        url: "https://flutter.dev/auth",
      },
      {
        id: "test-003",
        content: "StatefulWidget is a widget that has mutable state. Use StatefulWidget when you need to change data dynamically and want the UI to reflect those changes.",
        title: "StatefulWidget",
        url: "https://flutter.dev/widgets",
      },
    ];

    console.log(`\n📤 Generating embeddings for ${sampleDocs.length} test documents...`);
    console.log("⏳ This may take a moment (loading EmbeddingGemma model)...\n");

    const vectors = [];
    for (let i = 0; i < sampleDocs.length; i++) {
      const doc = sampleDocs[i];
      console.log(`[${i + 1}/${sampleDocs.length}] Generating embedding for: ${doc.id}`);

      const embedding = await generateLocalEmbedding(doc.content);

      vectors.push({
        id: doc.id,
        values: embedding,
        metadata: {
          content: doc.content,
          title: doc.title,
          url: doc.url,
          type: "test",
        },
      });
    }

    console.log(`\n📦 Uploading ${vectors.length} vectors to Pinecone...`);
    await index.upsert(vectors);

    console.log("✅ Upload successful!\n");

    // Test search
    console.log("🔍 Testing search with query: 'How to authenticate users?'");
    const queryEmbedding = await generateLocalEmbedding("How to authenticate users?");

    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: 2,
      includeMetadata: true,
    });

    console.log("\n📊 Search results:");
    searchResults.matches.forEach((match, idx) => {
      console.log(`\n${idx + 1}. [Score: ${match.score.toFixed(3)}] ${match.metadata.title}`);
      console.log(`   ${match.metadata.content.substring(0, 100)}...`);
    });

    console.log("\n✅ Test complete! Vector search is working properly.");
    console.log("💡 Now you can run the full upload with: node uploadToPinecone.js");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testUpload();
