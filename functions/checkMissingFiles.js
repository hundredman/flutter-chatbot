const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

/**
 * Compare GitHub files with Firestore and find missing files
 */
exports.checkMissingFiles = onRequest(
    {
      timeoutSeconds: 120,
      memory: "512MiB",
    },
    async (req, res) => {
      try {
        console.log("Fetching GitHub file list...");

        // Get all markdown files from GitHub
        const response = await axios.get(
            "https://api.github.com/repos/flutter/website/git/trees/main?recursive=1",
            {timeout: 30000},
        );

        const githubFiles = response.data.tree
            .filter((f) => f.path.startsWith("src") && f.path.endsWith(".md") && f.type === "blob")
            .map((f) => f.path)
            .sort();

        console.log(`GitHub has ${githubFiles.length} markdown files in src/`);

        // Get all documents from Firestore
        const db = admin.firestore();
        const snapshot = await db.collection("document_chunks").get();

        console.log(`Firestore has ${snapshot.size} document chunks`);

        // Extract unique file paths from Firestore
        const firestorePaths = new Set();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.githubPath) {
            firestorePaths.add(data.githubPath);
          }
        });

        console.log(`Firestore has chunks from ${firestorePaths.size} unique files`);

        // Find missing files
        const missingFiles = githubFiles.filter((path) => !firestorePaths.has(path));

        console.log(`Missing files: ${missingFiles.length}`);

        // Find files in Firestore but not in GitHub (shouldn't happen)
        const firestoreArray = Array.from(firestorePaths).sort();
        const extraFiles = firestoreArray.filter((path) => !githubFiles.includes(path));

        // Check for specific missing files
        const fundamentalsFiles = missingFiles.filter((p) => p.includes("get-started/fundamentals"));
        const getStartedFiles = missingFiles.filter((p) => p.includes("get-started/"));

        // Check for index.md files specifically
        const indexFiles = firestoreArray.filter((p) => p.endsWith("/index.md"));
        const getStartedIndexFiles = firestoreArray.filter((p) => p.includes("get-started") && p.endsWith("index.md"));

        res.json({
          success: true,
          github: {
            total: githubFiles.length,
            sample: githubFiles.slice(0, 5),
          },
          firestore: {
            totalChunks: snapshot.size,
            uniqueFiles: firestorePaths.size,
            sample: firestoreArray.slice(0, 5),
            indexFiles: indexFiles.length,
            indexSample: indexFiles.slice(0, 10),
            getStartedIndex: getStartedIndexFiles,
          },
          missing: {
            total: missingFiles.length,
            files: missingFiles.slice(0, 100),
            fundamentals: fundamentalsFiles,
            getStarted: getStartedFiles.slice(0, 20),
          },
          extra: {
            total: extraFiles.length,
            files: extraFiles.slice(0, 20),
          },
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    },
);
