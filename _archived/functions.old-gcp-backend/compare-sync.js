const admin = require("firebase-admin");
const axios = require("axios");

// Initialize Firebase Admin
admin.initializeApp({
  projectId: "hi-project-flutter-chatbot",
});

const db = admin.firestore();

async function compareSync() {
  console.log("Fetching GitHub file list...\n");

  // Get all markdown files from GitHub
  const response = await axios.get(
    "https://api.github.com/repos/flutter/website/git/trees/main?recursive=1"
  );

  const githubFiles = response.data.tree
    .filter((f) => f.path.startsWith("src") && f.path.endsWith(".md") && f.type === "blob")
    .map((f) => f.path);

  console.log(`GitHub has ${githubFiles.length} markdown files in src/\n`);

  console.log("Fetching Firestore documents...\n");

  // Get all documents from Firestore
  const snapshot = await db.collection("document_chunks").get();

  console.log(`Firestore has ${snapshot.size} document chunks\n`);

  // Extract unique file paths from Firestore
  const firestorePaths = new Set();
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.githubPath) {
      firestorePaths.add(data.githubPath);
    }
  });

  console.log(`Firestore has chunks from ${firestorePaths.size} unique files\n`);

  // Find missing files
  const missingFiles = githubFiles.filter((path) => !firestorePaths.has(path));

  console.log(`Missing files: ${missingFiles.length}\n`);

  if (missingFiles.length > 0) {
    console.log("Missing files list:");
    missingFiles.slice(0, 50).forEach((path, i) => {
      console.log(`  ${i + 1}. ${path}`);
    });

    if (missingFiles.length > 50) {
      console.log(`  ... and ${missingFiles.length - 50} more`);
    }

    // Check for specific missing files
    const fundamentalsFiles = missingFiles.filter((p) => p.includes("get-started/fundamentals"));
    if (fundamentalsFiles.length > 0) {
      console.log(`\n❌ Missing get-started/fundamentals files (${fundamentalsFiles.length}):`);
      fundamentalsFiles.forEach((path) => {
        console.log(`  - ${path}`);
      });
    }
  } else {
    console.log("✅ All GitHub files are synchronized!");
  }

  process.exit(0);
}

compareSync().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
