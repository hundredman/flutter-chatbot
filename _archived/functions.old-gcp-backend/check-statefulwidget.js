const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp({
  projectId: "hi-project-flutter-chatbot",
});

const db = admin.firestore();

async function checkStatefulWidget() {
  console.log("Searching for StatefulWidget in Firestore...\n");

  // Get all documents
  const snapshot = await db.collection("document_chunks").get();

  console.log(`Total documents in Firestore: ${snapshot.size}\n`);

  // Search for documents containing "StatefulWidget"
  const results = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    const content = (data.content || "").toLowerCase();
    const title = (data.title || "").toLowerCase();

    if (content.includes("statefulwidget") || title.includes("statefulwidget")) {
      results.push({
        id: doc.id,
        title: data.title,
        url: data.url,
        contentPreview: data.content.substring(0, 200),
      });
    }
  });

  console.log(`Found ${results.length} documents mentioning StatefulWidget:\n`);

  results.slice(0, 10).forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.title}`);
    console.log(`   URL: ${doc.url}`);
    console.log(`   Preview: ${doc.contentPreview}...`);
    console.log();
  });

  // Also check what the current search algorithm would return
  console.log("\n--- Testing current search algorithm ---\n");

  const query = "What is StatefulWidget?";
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

  console.log(`Query: "${query}"`);
  console.log(`Query terms: ${queryTerms.join(", ")}\n`);

  const scored = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    const contentLower = (data.content || "").toLowerCase();
    const titleLower = (data.title || "").toLowerCase();

    let similarity = 0;
    if (titleLower.includes(queryLower)) similarity += 0.5;

    for (const term of queryTerms) {
      if (contentLower.includes(term)) similarity += 0.1;
      if (titleLower.includes(term)) similarity += 0.15;
    }

    similarity = Math.min(similarity, 1.0);

    if (similarity > 0) {
      scored.push({
        title: data.title,
        url: data.url,
        similarity,
      });
    }
  });

  scored.sort((a, b) => b.similarity - a.similarity);

  console.log(`Top 10 results by current search algorithm:`);
  scored.slice(0, 10).forEach((doc, i) => {
    console.log(`${i + 1}. [${(doc.similarity * 100).toFixed(0)}%] ${doc.title}`);
    console.log(`   ${doc.url}`);
  });

  process.exit(0);
}

checkStatefulWidget().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
