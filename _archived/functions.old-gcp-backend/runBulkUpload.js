/**
 * Client script to repeatedly call the bulk upload Cloud Function
 * This will process all 22,609 documents in batches
 */

const axios = require("axios");

const FUNCTION_URL = "https://us-central1-hi-project-flutter-chatbot.cloudfunctions.net/bulkUploadToPinecone";
const BATCH_SIZE = 20;
const TOTAL_DOCS = 22609;

async function runBulkUpload() {
  console.log("🚀 Starting bulk upload process...");
  console.log(`📊 Total documents: ${TOTAL_DOCS}`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`🔄 Estimated batches: ${Math.ceil(TOTAL_DOCS / BATCH_SIZE)}\n`);

  let startIndex = 0;
  let totalProcessed = 0;
  let batchNumber = 1;

  while (startIndex < TOTAL_DOCS) {
    try {
      console.log(`\n📤 Batch ${batchNumber}: Processing documents ${startIndex} to ${startIndex + BATCH_SIZE - 1}...`);

      const response = await axios.post(FUNCTION_URL, {
        startIndex,
        batchSize: BATCH_SIZE,
      }, {
        timeout: 540000, // 9 minutes
      });

      const {processed, nextIndex, message} = response.data;

      console.log(`✅ ${message}`);
      totalProcessed += processed;

      const progress = ((totalProcessed / TOTAL_DOCS) * 100).toFixed(1);
      console.log(`📈 Progress: ${totalProcessed}/${TOTAL_DOCS} (${progress}%)`);

      if (processed === 0) {
        console.log("\n✅ All documents processed!");
        break;
      }

      startIndex = nextIndex;
      batchNumber++;

      // Small delay between batches to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`\n❌ Error in batch ${batchNumber}:`, error.message);

      if (error.response) {
        console.error("Response data:", error.response.data);
      }

      // Wait a bit longer before retrying
      console.log("⏳ Waiting 5 seconds before retry...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log("\n🎉 Bulk upload complete!");
  console.log(`📊 Total documents processed: ${totalProcessed}`);
}

runBulkUpload().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
