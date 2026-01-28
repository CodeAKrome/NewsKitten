# News Article Categorization System

Automatically categorize news articles using semantic similarity and vector embeddings.

## Features

- Semantic article clustering using sentence embeddings
- ChromaDB vector storage for efficient similarity search
- DBSCAN clustering for automatic category discovery
- Keyword-based category naming
- JSON export for integration with other systems

## Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Basic Usage

```bash
python main.py --input articles.tsv --output categories.json
```

### Advanced Options

```bash
python main.py \
  --input articles.tsv \
  --output categories.json \
  --min-cluster-size 3 \
  --similarity-threshold 0.8 \
  --persist-dir ./my_chroma_db
```

### Parameters

- `--input`: Path to TSV file with article_id and title columns (required)
- `--output`: Output JSON file path (default: categories.json)
- `--min-cluster-size`: Minimum articles per category (default: 2)
- `--similarity-threshold`: Cosine similarity threshold 0-1 (default: 0.75)
- `--persist-dir`: ChromaDB storage directory (default: ./chroma_db)

## Input Format

TSV file with header row:

```
article_id	title
1001	Stock Market Reaches All-Time High
1002	Local Team Wins Championship
```

## Output Format

JSON file with categorized articles:

```json
{
  "categories": [
    {
      "category_id": 1,
      "category_name": "Business/Finance",
      "article_count": 2,
      "articles": [...]
    }
  ],
  "uncategorized": [...]
}
```

## Parameter Tuning

### Similarity Threshold (0.5 - 0.9)
- **Higher (0.8-0.9)**: Stricter grouping, more specific categories
- **Lower (0.5-0.7)**: Broader categories, fewer uncategorized articles

### Min Cluster Size
- **Higher values**: Only create well-populated categories
- **Lower values**: Capture niche topics

## Architecture

- `main.py`: CLI interface and workflow orchestration
- `embeddings.py`: Sentence transformer embedding generation
- `chroma_manager.py`: Vector database operations
- `categorizer.py`: DBSCAN clustering and naming
- `file_handler.py`: I/O operations
- `config.py`: Configuration constants

## Troubleshooting

**Model download fails**: Ensure internet connection for first run
**ChromaDB errors**: Delete ./chroma_db directory and retry
**Empty categories**: Lower similarity threshold or min cluster size

![tuning](tuning.png)
