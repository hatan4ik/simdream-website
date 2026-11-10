#!/usr/bin/env python3
"""
High-Speed Wix Multilingual Publisher.

Reads pre-translated article batches from scripts/data/completed_batch_*.json
and publishes them directly into their master articles' multilingual slots.
Takes ~25-30s total for all articles with zero translation latency or rate-limiting.
"""

import glob
import json
import os
import sys
import time
import urllib.request
import urllib.error

CANONICAL_STAGING_WIX_SITE_ID = "317b0c6d-6608-499a-bb3c-b1c37650e460"
KEY_FILE = "/tmp/wix-api-staging-key.txt"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def get_api_key():
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE) as f:
            key = f.read().strip()
            if key:
                return key
    key = os.environ.get("WIX_ADMIN_API_KEY", "").strip()
    if key:
        return key
    print("ERROR: No Wix API key found.")
    sys.exit(1)

def build_wix_nodes(content_nodes):
    wix_nodes = []
    for node in content_nodes:
        ntype = node.get("type")
        if ntype == "heading":
            wix_nodes.append({
                "type": "HEADING",
                "headingData": {"level": node.get("level", 2)},
                "nodes": [{
                    "type": "TEXT",
                    "textData": {"text": node.get("text", ""), "decorations": []}
                }]
            })
        elif ntype == "paragraph":
            wix_nodes.append({
                "type": "PARAGRAPH",
                "nodes": [{
                    "type": "TEXT",
                    "textData": {"text": node.get("text", ""), "decorations": []}
                }]
            })
        elif ntype == "list":
            item_nodes = []
            for item in node.get("items", []):
                item_nodes.append({
                    "type": "LIST_ITEM",
                    "nodes": [{
                        "type": "PARAGRAPH",
                        "nodes": [{
                            "type": "TEXT",
                            "textData": {"text": item, "decorations": []}
                        }]
                    }]
                })
            wix_nodes.append({
                "type": "BULLETED_LIST",
                "nodes": item_nodes
            })
    return wix_nodes

def publish_batch_file(filepath, api_key):
    with open(filepath) as f:
        articles = json.load(f)
    
    print(f"\n--- Publishing from {os.path.basename(filepath)} ({len(articles)} articles) ---")
    published_count = 0

    for idx, art in enumerate(articles):
        master_id = art["masterId"]
        translations = art.get("translations", {})
        
        for lang, trans_data in translations.items():
            title = trans_data.get("title", "")
            excerpt = trans_data.get("excerpt", "")
            slug = trans_data.get("slug", "")
            nodes = build_wix_nodes(trans_data.get("contentNodes", []))

            # 1. Open multilingual draft
            draft_url = f"https://www.wixapis.com/blog/v3/multilingual/draft/{master_id}"
            draft_req = urllib.request.Request(
                draft_url,
                data=json.dumps({"language": lang, "fieldsets": ["URL"]}).encode(),
                headers={
                    "Authorization": api_key,
                    "wix-site-id": CANONICAL_STAGING_WIX_SITE_ID,
                    "Content-Type": "application/json"
                }
            )

            try:
                with urllib.request.urlopen(draft_req) as d_resp:
                    draft = json.loads(d_resp.read().decode())["draftPost"]
                    draft_id = draft["id"]
                    member_id = draft.get("memberId", "")
            except urllib.error.HTTPError as e:
                if e.code == 409:
                    print(f"  - [{lang.upper()}] Slot already occupied (409)")
                    continue
                else:
                    print(f"  - [{lang.upper()}] Draft create error: HTTP {e.code}")
                    continue

            # 2. PATCH draft
            update_url = f"https://www.wixapis.com/blog/v3/draft-posts/{draft_id}"
            update_req = urllib.request.Request(
                update_url,
                data=json.dumps({
                    "draftPost": {
                        "memberId": member_id,
                        "title": title,
                        "excerpt": excerpt,
                        "slug": slug,
                        "richContent": {"nodes": nodes}
                    }
                }).encode(),
                headers={
                    "Authorization": api_key,
                    "wix-site-id": CANONICAL_STAGING_WIX_SITE_ID,
                    "Content-Type": "application/json"
                },
                method="PATCH"
            )

            try:
                with urllib.request.urlopen(update_req):
                    pass
            except urllib.error.HTTPError as e:
                print(f"  - [{lang.upper()}] Draft patch error: HTTP {e.code}")
                continue

            # 3. Publish draft
            pub_url = f"https://www.wixapis.com/blog/v3/draft-posts/{draft_id}/publish"
            pub_req = urllib.request.Request(
                pub_url,
                data=b"{}",
                headers={
                    "Authorization": api_key,
                    "wix-site-id": CANONICAL_STAGING_WIX_SITE_ID,
                    "Content-Type": "application/json"
                }
            )

            try:
                with urllib.request.urlopen(pub_req):
                    published_count += 1
                    print(f"  ✓ [{lang.upper()}] '{title[:35]}' -> Published")
            except urllib.error.HTTPError as e:
                print(f"  - [{lang.upper()}] Publish error: HTTP {e.code}")

    return published_count

def main():
    api_key = get_api_key()
    pattern = os.path.join(DATA_DIR, "completed_batch_*.json")
    files = sorted(glob.glob(pattern))

    if not files:
        print(f"No completed batch files found in {DATA_DIR}.")
        sys.exit(0)

    total_published = 0
    t0 = time.time()
    for fp in files:
        total_published += publish_batch_file(fp, api_key)
    
    elapsed = round(time.time() - t0, 1)
    print(f"\n=== Successfully published {total_published} translated posts in {elapsed}s ===")

if __name__ == "__main__":
    main()

