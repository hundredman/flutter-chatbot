const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Crawl and extract text content from a URL
 * @param {string} url - URL to crawl
 * @return {Promise<Object>} - {title, content, error}
 */
async function crawlUrl(url) {
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new Error("Only HTTP/HTTPS URLs are supported");
    }

    console.log(`Crawling URL: ${url}`);

    // Fetch the page
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FlutterChatbot/1.0)",
      },
      maxRedirects: 5,
    });

    // Parse HTML
    const $ = cheerio.load(response.data);

    // Remove script, style, and other non-content tags
    $("script, style, nav, header, footer, iframe").remove();

    // Get page title
    const title = $("title").text().trim() || url;

    // Extract main content - try common content selectors
    let content = "";

    // Try to find main content area
    const mainSelectors = [
      "main",
      "article",
      '[role="main"]',
      ".content",
      "#content",
      ".main-content",
      "#main-content",
      ".post-content",
      ".entry-content",
    ];

    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // If no main content found, get body text
    if (!content) {
      content = $("body").text();
    }

    // Clean up the content
    content = content
        .replace(/\s+/g, " ") // Replace multiple whitespace with single space
        .replace(/\n+/g, "\n") // Replace multiple newlines with single newline
        .trim();

    // Limit content length (max 10000 chars)
    if (content.length > 10000) {
      content = content.substring(0, 10000) + "... (content truncated)";
    }

    console.log(`Successfully crawled ${url} - Title: ${title}, Content length: ${content.length}`);

    return {
      title: title,
      content: content,
      url: url,
      success: true,
    };
  } catch (error) {
    console.error(`Error crawling URL ${url}:`, error.message);

    return {
      title: url,
      content: `Error: Failed to crawl URL - ${error.message}`,
      url: url,
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  crawlUrl,
};
