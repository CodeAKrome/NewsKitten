#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Python script bridge
const PYTHON_BRIDGE_PATH = path.join(__dirname, "..", "python_bridge.py");
const SRC_DIR = path.join(__dirname, "..", "..", "src");

/**
 * Execute Python script with arguments and return JSON output
 */
async function runPythonBridge(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python3", [PYTHON_BRIDGE_PATH, ...args], {
      cwd: SRC_DIR,
      env: { ...process.env, PYTHONPATH: SRC_DIR }
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python bridge failed: ${stderr || stdout}`));
      } else {
        try {
          // Find JSON output (it should be the last line)
          const lines = stdout.trim().split("\n");
          const jsonLine = lines.find(line => line.startsWith("{") || line.startsWith("["));
          if (jsonLine) {
            resolve(JSON.parse(jsonLine));
          } else {
            resolve({ success: true, output: stdout.trim() });
          }
        } catch (e) {
          resolve({ success: true, output: stdout.trim() });
        }
      }
    });

    pythonProcess.on("error", (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
}

// Create MCP server
const server = new McpServer({
  name: "newskit-mcp-server",
  version: "1.0.0"
});

// Tool: Categorize articles from TSV file
server.tool(
  "categorize_articles",
  {
    inputPath: z.string().describe("Path to input TSV file with article_id and title columns"),
    outputPath: z.string().optional().describe("Path to output JSON file (default: categories.json)"),
    minClusterSize: z.number().min(1).optional().describe("Minimum articles per category (default: 2)"),
    similarityThreshold: z.number().min(0).max(1).optional().describe("Cosine similarity threshold 0-1 (default: 0.75)"),
    persistDir: z.string().optional().describe("ChromaDB storage directory (default: ./chroma_db)")
  },
  async ({ inputPath, outputPath, minClusterSize, similarityThreshold, persistDir }) => {
    try {
      // Validate input file exists
      if (!fs.existsSync(inputPath)) {
        return {
          content: [{ type: "text", text: `Error: Input file not found: ${inputPath}` }],
          isError: true
        };
      }

      const args = [
        "categorize",
        "--input", inputPath,
        "--output", outputPath || "categories.json",
        "--min-cluster-size", String(minClusterSize || 2),
        "--similarity-threshold", String(similarityThreshold || 0.75),
        "--persist-dir", persistDir || "./chroma_db"
      ];

      const result = await runPythonBridge(args);

      return {
        content: [
          {
            type: "text",
            text: `Categorization complete!\n\nResults:\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Categorization failed: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Load and view articles from TSV
server.tool(
  "load_articles",
  {
    inputPath: z.string().describe("Path to input TSV file with article_id and title columns"),
    limit: z.number().optional().describe("Maximum number of articles to return (default: 50)")
  },
  async ({ inputPath, limit }) => {
    try {
      if (!fs.existsSync(inputPath)) {
        return {
          content: [{ type: "text", text: `Error: Input file not found: ${inputPath}` }],
          isError: true
        };
      }

      const args = [
        "load",
        "--input", inputPath,
        "--limit", String(limit || 50)
      ];

      const result = await runPythonBridge(args);

      return {
        content: [
          {
            type: "text",
            text: `Articles loaded (${result.count} total):\n\n${JSON.stringify(result.articles, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to load articles: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Search similar articles in ChromaDB
server.tool(
  "search_similar",
  {
    query: z.string().describe("Search query to find similar articles"),
    persistDir: z.string().optional().describe("ChromaDB storage directory (default: ./chroma_db)"),
    nResults: z.number().min(1).max(20).optional().describe("Number of results to return (default: 5)")
  },
  async ({ query, persistDir, nResults }) => {
    try {
      const args = [
        "search",
        "--query", query,
        "--persist-dir", persistDir || "./chroma_db",
        "--n-results", String(nResults || 5)
      ];

      const result = await runPythonBridge(args);

      return {
        content: [
          {
            type: "text",
            text: `Search results for "${query}":\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Search failed: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get categories from results file
server.tool(
  "get_categories",
  {
    resultsPath: z.string().describe("Path to the categories.json results file")
  },
  async ({ resultsPath }) => {
    try {
      if (!fs.existsSync(resultsPath)) {
        return {
          content: [{ type: "text", text: `Error: Results file not found: ${resultsPath}` }],
          isError: true
        };
      }

      const content = fs.readFileSync(resultsPath, "utf-8");
      const data = JSON.parse(content);

      let output = "Categories:\n\n";
      if (data.categories) {
        for (const cat of data.categories) {
          output += `Category ${cat.category_id}: "${cat.category_name}" (${cat.article_count} articles)\n`;
          for (const article of cat.articles) {
            output += `  - ${article.article_id}: ${article.title}\n`;
          }
          output += "\n";
        }
      }
      
      if (data.uncategorized && data.uncategorized.length > 0) {
        output += `Uncategorized: ${data.uncategorized.length} articles\n`;
        for (const article of data.uncategorized.slice(0, 10)) {
          output += `  - ${article.article_id}: ${article.title}\n`;
        }
        if (data.uncategorized.length > 10) {
          output += `  ... and ${data.uncategorized.length - 10} more\n`;
        }
      }

      return {
        content: [{ type: "text", text: output }]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to read categories: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NewsKit MCP server running on stdio");
}

main();
