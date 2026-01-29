#!/usr/bin/env python3
"""
Python bridge script for NewsKit MCP server.
This script provides a command-line interface to the NewsKit functionality
that can be called from the TypeScript MCP server.
"""

import argparse
import json
import sys
import os

# Add the parent directory to Python path to find src
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src_dir = os.path.join(parent_dir, 'src')
sys.path.insert(0, parent_dir)
sys.path.insert(0, src_dir)

from file_handler import load_articles, export_results
from embeddings import generate_embeddings
from chroma_manager import initialize_chroma, add_articles_to_chroma
from categorizer import cluster_articles, generate_category_names, format_results
from chromadb.config import Settings
import config

import chromadb


def cmd_categorize(args):
    """Run the full categorization pipeline."""
    try:
        # Step 1: Load articles
        articles_df = load_articles(args.input)
        
        if articles_df.empty:
            print(json.dumps({"error": "No articles found in input file"}))
            return 1
        
        # Step 2: Generate embeddings
        titles = articles_df['title'].tolist()
        embeddings = generate_embeddings(titles)
        
        # Step 3: Initialize ChromaDB
        collection = initialize_chroma(
            collection_name=config.COLLECTION_NAME,
            persist_dir=args.persist_dir
        )
        
        # Step 4: Add articles to ChromaDB
        add_articles_to_chroma(collection, articles_df, embeddings)
        
        # Step 5: Cluster articles
        cluster_labels = cluster_articles(
            embeddings,
            method="dbscan",
            min_samples=args.min_cluster_size,
            eps=1 - args.similarity_threshold
        )
        
        # Step 6: Generate category names
        categories = generate_category_names(
            articles_df,
            cluster_labels,
            args.min_cluster_size
        )
        
        # Step 7: Format and export results
        results = format_results(categories, articles_df, cluster_labels)
        export_results(results, args.output)
        
        # Output summary
        summary = {
            "success": True,
            "total_articles": len(articles_df),
            "categories_count": len(results['categories']),
            "uncategorized_count": len(results['uncategorized']),
            "output_file": args.output
        }
        print(json.dumps(summary))
        return 0
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return 1


def cmd_load(args):
    """Load and return articles from TSV file."""
    try:
        articles_df = load_articles(args.input)
        
        # Convert to list of dicts
        articles = articles_df.head(args.limit).to_dict('records')
        
        result = {
            "count": len(articles_df),
            "articles": [
                {"article_id": str(a['article_id']), "title": a['title']}
                for a in articles
            ]
        }
        print(json.dumps(result))
        return 0
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return 1


def cmd_search(args):
    """Search for similar articles in ChromaDB."""
    try:
        # Initialize ChromaDB client
        settings = Settings(anonymized_telemetry=False, allow_reset=True)
        client = chromadb.PersistentClient(path=args.persist_dir, settings=settings)
        
        # Get the collection
        try:
            collection = client.get_collection(name=config.COLLECTION_NAME)
        except Exception:
            print(json.dumps({"error": "Collection not found. Run categorization first."}))
            return 1
        
        # Query the collection
        results = collection.query(
            query_texts=[args.query],
            n_results=args.n_results
        )
        
        # Format results
        formatted_results = []
        if results['ids'] and len(results['ids']) > 0:
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    "article_id": results['ids'][0][i],
                    "title": results['documents'][0][i] if results['documents'] else "",
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "distance": results['distances'][0][i] if results['distances'] else None
                })
        
        print(json.dumps({
            "query": args.query,
            "results": formatted_results
        }))
        return 0
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return 1


def main():
    parser = argparse.ArgumentParser(description="NewsKit Python Bridge")
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Categorize command
    categorize_parser = subparsers.add_parser('categorize', help='Categorize articles')
    categorize_parser.add_argument('--input', required=True, help='Input TSV file path')
    categorize_parser.add_argument('--output', default='categories.json', help='Output JSON file path')
    categorize_parser.add_argument('--min-cluster-size', type=int, default=2, help='Minimum cluster size')
    categorize_parser.add_argument('--similarity-threshold', type=float, default=0.75, help='Similarity threshold')
    categorize_parser.add_argument('--persist-dir', default='./chroma_db', help='ChromaDB persistence directory')
    
    # Load command
    load_parser = subparsers.add_parser('load', help='Load articles from TSV')
    load_parser.add_argument('--input', required=True, help='Input TSV file path')
    load_parser.add_argument('--limit', type=int, default=50, help='Maximum articles to return')
    
    # Search command
    search_parser = subparsers.add_parser('search', help='Search similar articles')
    search_parser.add_argument('--query', required=True, help='Search query')
    search_parser.add_argument('--persist-dir', default='./chroma_db', help='ChromaDB persistence directory')
    search_parser.add_argument('--n-results', type=int, default=5, help='Number of results')
    
    args = parser.parse_args()
    
    if args.command == 'categorize':
        return cmd_categorize(args)
    elif args.command == 'load':
        return cmd_load(args)
    elif args.command == 'search':
        return cmd_search(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
