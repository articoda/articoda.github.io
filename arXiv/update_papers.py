import json
import time
from pathlib import Path
from datetime import datetime, timedelta

import feedparser
import requests


# Files live in the same directory as this script
BASE_DIR = Path(__file__).resolve().parent
AUTHORS_FILE = BASE_DIR / "authors_list"
OUTPUT_FILE = BASE_DIR / "papers.json"


def chunk_list(lst, n):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


# --------------------------------------------------
# 1. Generate time interval
# --------------------------------------------------

now = datetime.now()

today = now.strftime("%Y%m%d") + "0600"
day_of_week = now.weekday()

if day_of_week == 0 or day_of_week == 1:
    yesterday = (now - timedelta(days=4)).strftime("%Y%m%d") + "0001"
else:
    yesterday = (now - timedelta(days=2)).strftime("%Y%m%d") + "0001"

time_interval = f"submittedDate:[{yesterday}+TO+{today}]"
categories = "%28cat:hep-th+OR+cat:hep-ph%29"


# --------------------------------------------------
# 2. Read authors
# --------------------------------------------------

with open(AUTHORS_FILE, encoding="utf-8") as file:
    author_list = [
        line.strip()
        for line in file
        if line.strip()
    ]


# --------------------------------------------------
# 3. Query arXiv in batches
# --------------------------------------------------

batch_size = 10
all_entries = []

for author_chunk in chunk_list(author_list, batch_size):

    authors_query = "+OR+".join(
    ['au:%22' + a.replace(" ", "+") + '%22' for a in author_chunk]
    )

    query_url = (
        "https://export.arxiv.org/api/query?search_query="
        "%28"
        + categories
        + "+AND+%28"
        + authors_query
        + "%29%29"
        + "+AND+"
        + time_interval
        + "&start=0&max_results=100"
    )

    response = requests.get(query_url, timeout=30)

    if response.status_code == 200:
        feed = feedparser.parse(response.text)

        # Keep only papers with fewer than 20 authors
        all_entries.extend(
            entry
            for entry in feed.entries
            if len(entry.authors) < 20
        )

    elif response.status_code == 429:
        print("Error 429: arXiv rate limit reached.")
        break

    else:
        print(
            f"Error {response.status_code} "
            f"for batch starting with {author_chunk[0]}"
        )

    # Respect arXiv's request interval
    time.sleep(3)


# --------------------------------------------------
# 4. Remove duplicates
# --------------------------------------------------

unique_entries = list(
    {entry.id: entry for entry in all_entries}.values()
)


# --------------------------------------------------
# 5. Convert results to JSON
# --------------------------------------------------

papers = []

for entry in unique_entries:

    papers.append(
        {
            "title": " ".join(entry.title.split()),
            "authors": [
                author.name
                for author in entry.authors
            ],
            "categories": [
                tag.term
                for tag in entry.tags
            ],
            "link": entry.link,
            "published": entry.published,
        }
    )


data = {
    "generated_at": datetime.now().astimezone().isoformat(),
    "papers": papers,
}


# --------------------------------------------------
# 6. Write papers.json
# --------------------------------------------------

with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
    json.dump(
        data,
        file,
        indent=2,
        ensure_ascii=False,
    )


print(
    f"Wrote {len(papers)} papers to {OUTPUT_FILE}"
)
