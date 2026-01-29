# NewsKit MCP Server

An MCP server for intelligent news article categorization using embeddings and clustering. Automatically groups similar articles together and generates human-readable category names.

## Features

- **Semantic Categorization**: Uses sentence-transformers to generate embeddings and DBSCAN clustering to group similar articles
- **ChromaDB Integration**: Stores article embeddings for fast semantic search
- **Automatic Category Naming**: Uses TF-IDF to extract keywords and generate descriptive category names
- **Configurable Parameters**: Adjust similarity thresholds and minimum cluster sizes to fine-tune results
- **Search Capability**: Find semantically similar articles using natural language queries

## Tools

### categorize_articles

Run the full categorization pipeline on a TSV file of news articles.

**Parameters:**
- `inputPath` (required): Path to TSV file with `article_id` and `title` columns
- `outputPath` (optional): Output JSON file path (default: `categories.json`)
- `minClusterSize` (optional): Minimum articles per category (default: 2)
- `similarityThreshold` (optional): Cosine similarity threshold 0-1 (default: 0.75)
- `persistDir` (optional): ChromaDB storage directory (default: `./chroma_db`)

**Example:**
```json
{
  "inputPath": "/path/to/articles.tsv",
  "outputPath": "/path/to/categories.json",
  "similarityThreshold": 0.8,
  "minClusterSize": 3
}
```

### load_articles

Preview articles from a TSV file without categorizing.

**Parameters:**
- `inputPath` (required): Path to TSV file
- `limit` (optional): Maximum articles to return (default: 50)

### search_similar

Search for semantically similar articles using natural language queries.

**Parameters:**
- `query` (required): Search query text
- `persistDir` (optional): ChromaDB directory (default: `./chroma_db`)
- `nResults` (optional): Number of results (default: 5, max: 20)

### get_categories

Display categorized results from a JSON output file.

**Parameters:**
- `resultsPath` (required): Path to categories.json file

## Installation

### Prerequisites

- Node.js 18 or higher
- Python 3.8 or higher
- Python dependencies: `pip install chromadb sentence-transformers pandas numpy scikit-learn`

### From NPM

```bash
npm install -g newskit-mcp-server
```

### From Source

```bash
git clone https://github.com/CodeAKrome/newskit-mcp-server.git
cd newskit-mcp-server
npm install
npm run build
```

## Configuration

Add to your MCP settings file:

```json
{
  "mcpServers": {
    "newskit": {
      "command": "node",
      "args": ["/path/to/newskit-mcp-server/build/index.js"],
      "disabled": false,
      "alwaysAllow": [],
      "disabledTools": []
    }
  }
}
```

Or if installed via npm:

```json
{
  "mcpServers": {
    "newskit": {
      "command": "npx",
      "args": ["newskit-mcp-server"],
      "disabled": false
    }
  }
}
```

## Input Format

The input TSV file should have two columns:
- `article_id`: Unique identifier for the article
- `title`: Article title text

Example:
```tsv
article_id	title
abc123	Venezuela releases over 100 political prisoners
def456	Seahawks advance to Super Bowl with thrilling win
```

## Output Format

The output JSON file contains:

```json
{
  "categories": [
    {
      "category_id": 1,
      "category_name": "Venezuela / Prisoners",
      "article_count": 3,
      "articles": [
        {"article_id": "abc123", "title": "Venezuela releases..."}
      ]
    }
  ],
  "uncategorized": [
    {"article_id": "xyz789", "title": "Unique article..."}
  ]
}
```

## Tuning Guide

| Goal | Parameter Adjustment |
|------|---------------------|
| More categories (looser) | Lower `similarityThreshold` (try 0.65) |
| Fewer, tighter categories | Raise `similarityThreshold` (try 0.85) |
| Only major categories | Raise `minClusterSize` (try 5) |
| Include smaller clusters | Lower `minClusterSize` (try 2) |

## Architecture

- **TypeScript MCP Server**: Provides the tool interface via stdio transport
- **Python Bridge**: Interfaces with ML libraries (sentence-transformers, scikit-learn)
- **ChromaDB**: Vector database for embedding storage and similarity search
- **Sentence-Transformers**: all-MiniLM-L6-v2 model for generating embeddings
- **DBSCAN**: Clustering algorithm for grouping similar articles
- **TF-IDF**: Keyword extraction for automatic category naming

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.
