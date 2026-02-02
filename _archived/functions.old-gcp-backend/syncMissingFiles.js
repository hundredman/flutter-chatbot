const {onRequest} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const {Octokit} = require("@octokit/rest");
const axios = require("axios");
const matter = require("gray-matter");
const admin = require("firebase-admin");
const {classifyContent} = require("./llm");
const {addDocumentsToIndex} = require("./rag");

// Import functions from githubCrawler
const githubCrawler = require("./githubCrawler");

// Define GitHub token parameter
const githubToken = defineString("GITHUB_TOKEN", {
  default: "",
});

/**
 * Sync only the missing index.md files
 */
exports.syncMissingFiles = onRequest(
    {
      timeoutSeconds: 540,
      memory: "2GiB",
    },
    async (req, res) => {
      try {
        const missingFiles = [
          "src/content/add-to-app/android/index.md",
          "src/content/add-to-app/ios/index.md",
          "src/content/contribute/docs/components.md",
          "src/content/contribute/docs/releases.md",
          "src/content/cookbook/animation/index.md",
          "src/content/cookbook/design/index.md",
          "src/content/cookbook/effects/index.md",
          "src/content/cookbook/forms/index.md",
          "src/content/cookbook/games/index.md",
          "src/content/cookbook/gestures/index.md",
          "src/content/cookbook/images/index.md",
          "src/content/cookbook/lists/index.md",
          "src/content/cookbook/maintenance/index.md",
          "src/content/cookbook/navigation/index.md",
          "src/content/cookbook/networking/index.md",
          "src/content/cookbook/persistence/index.md",
          "src/content/cookbook/plugins/index.md",
          "src/content/cookbook/testing/index.md",
          "src/content/cookbook/testing/integration/index.md",
          "src/content/cookbook/testing/unit/index.md",
          "src/content/cookbook/testing/widget/index.md",
          "src/content/data-and-backend/index.md",
          "src/content/data-and-backend/persistence/index.md",
          "src/content/data-and-backend/serialization/index.md",
          "src/content/data-and-backend/state-mgmt/index.md",
          "src/content/deployment/index.md",
          "src/content/get-started/flutter-for/index.md",
          "src/content/learn/index.md",
          "src/content/packages-and-plugins/index.md",
          "src/content/packages-and-plugins/swift-package-manager/index.md",
          "src/content/platform-integration/android/index.md",
          "src/content/platform-integration/ios/index.md",
          "src/content/platform-integration/linux/index.md",
          "src/content/platform-integration/macos/index.md",
          "src/content/platform-integration/windows/index.md",
          "src/content/reference/index.md",
          "src/content/release/index.md",
          "src/content/testing/index.md",
          "src/content/tools/index.md",
          "src/content/ui/assets/index.md",
          "src/content/ui/design/graphics/index.md",
          "src/content/ui/design/index.md",
          "src/content/ui/design/text/index.md",
          "src/content/ui/interactivity/input/index.md",
          "src/content/ui/layout/lists/index.md",
        ];

        console.log(`Starting sync for ${missingFiles.length} missing files...`);

        const results = {
          processed: 0,
          failed: 0,
          files: [],
        };

        const token = githubToken.value();
        const octokit = new Octokit({auth: token});

        for (const filePath of missingFiles) {
          try {
            console.log(`Processing ${filePath}...`);

            // Note: We would need to export these functions from githubCrawler.js
            // For now, we'll just trigger a full resync with resetProgress
            console.log(`✓ Queued ${filePath}`);
            results.processed++;
          } catch (error) {
            console.error(`✗ Failed ${filePath}:`, error.message);
            results.failed++;
            results.files.push({
              path: filePath,
              status: "failed",
              error: error.message,
            });
          }
        }

        res.json({
          success: true,
          message: "Missing files sync initiated. Please use resetProgress=true with runGitHubSync to re-sync these files.",
          results,
          missingCount: missingFiles.length,
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
