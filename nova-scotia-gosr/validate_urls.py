"""
Validate and fix resource URLs from deduplicated Nova Scotia GOSR data.

For each unique URL:
- HTTP HEAD/GET check with hard per-request timeout
- Retry with backoff on transient failures (429, 503)
- If broken but root domain works -> replace with root domain
- If root domain also dead -> remove the URL
- Track suspected rate-limiting separately to avoid false negatives
"""

import asyncio
import json
import logging
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

try:
    import aiohttp
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp"])
    import aiohttp

logging.getLogger("aiohttp").setLevel(logging.CRITICAL)

INPUT_PATH = Path("/home/kkells/data/nova-scotia-gosr/nova-scotia-gosr-deduplicated.json")
OUTPUT_PATH = Path("/home/kkells/data/nova-scotia-gosr/nova-scotia-gosr-urls-cleaned.json")
STATS_PATH = Path("/home/kkells/data/nova-scotia-gosr/url-validation-stats.json")
CONCURRENCY = 5
PER_REQUEST_TIMEOUT = 8
MAX_RETRIES = 1
RETRY_CODES = {429, 503, 502, 520, 521, 522, 523, 524}


def get_root_domain_url(url: str) -> str:
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
        return f"{parsed.scheme}://{parsed.netloc}"
    except Exception:
        return ""


async def single_request(session, method, url):
    try:
        async with session.request(
            method, url, allow_redirects=True,
            timeout=aiohttp.ClientTimeout(total=PER_REQUEST_TIMEOUT, connect=5)
        ) as resp:
            return resp.status
    except Exception:
        return None


async def check_url(session, url):
    if not url or not url.strip():
        return {"url": url, "status": "empty", "code": None}

    if not url.startswith("http"):
        url = f"https://{url}"

    for attempt in range(MAX_RETRIES + 1):
        try:
            status = await asyncio.wait_for(
                single_request(session, "HEAD", url),
                timeout=PER_REQUEST_TIMEOUT + 2
            )
        except (asyncio.TimeoutError, Exception):
            status = None

        if status is not None and status < 400:
            return {"url": url, "status": "ok", "code": status}

        if status in RETRY_CODES and attempt < MAX_RETRIES:
            await asyncio.sleep(1)
            continue

        try:
            status = await asyncio.wait_for(
                single_request(session, "GET", url),
                timeout=PER_REQUEST_TIMEOUT + 2
            )
        except (asyncio.TimeoutError, Exception):
            status = None

        if status is not None and status < 400:
            return {"url": url, "status": "ok", "code": status}

        if status in RETRY_CODES:
            return {"url": url, "status": "rate_limited", "code": status}

        if status is None and attempt > 0:
            return {"url": url, "status": "suspect_blocked", "code": "timeout"}

    return {"url": url, "status": "broken", "code": status}


async def check_urls_batch(urls):
    results = {}
    semaphore = asyncio.Semaphore(CONCURRENCY)

    connector = aiohttp.TCPConnector(limit=CONCURRENCY, ttl_dns_cache=300, enable_cleanup_closed=True)
    async with aiohttp.ClientSession(
        headers={"User-Agent": "Mozilla/5.0 (compatible; GOSR-Validator/1.0)"},
        connector=connector
    ) as session:

        async def bounded(url):
            async with semaphore:
                await asyncio.sleep(0.15)
                try:
                    return url, await asyncio.wait_for(check_url(session, url), timeout=30)
                except asyncio.TimeoutError:
                    return url, {"url": url, "status": "broken", "code": "hard_timeout"}
                except Exception as e:
                    return url, {"url": url, "status": "broken", "code": type(e).__name__}

        tasks = [asyncio.ensure_future(bounded(url)) for url in urls]
        done_count = 0
        total = len(tasks)

        for coro in asyncio.as_completed(tasks):
            url, result = await coro
            results[url] = result
            done_count += 1
            if done_count % 100 == 0 or done_count == total:
                ok = sum(1 for r in results.values() if r["status"] == "ok")
                broken = sum(1 for r in results.values() if r["status"] == "broken")
                suspect = sum(1 for r in results.values() if r["status"] in ("rate_limited", "suspect_blocked"))
                print(f"  [{done_count}/{total}] ok={ok} broken={broken} suspect={suspect}", flush=True)

    return results


async def check_root_domains_batch(broken_urls):
    results = {}
    root_cache = {}
    semaphore = asyncio.Semaphore(CONCURRENCY)

    connector = aiohttp.TCPConnector(limit=CONCURRENCY, ttl_dns_cache=300, enable_cleanup_closed=True)
    async with aiohttp.ClientSession(
        headers={"User-Agent": "Mozilla/5.0 (compatible; GOSR-Validator/1.0)"},
        connector=connector
    ) as session:

        async def bounded(url):
            root = get_root_domain_url(url)
            if not root:
                return url, {"root": "", "status": "no_root"}

            async with semaphore:
                if root not in root_cache:
                    await asyncio.sleep(0.15)
                    try:
                        root_cache[root] = await asyncio.wait_for(
                            check_url(session, root), timeout=30
                        )
                    except asyncio.TimeoutError:
                        root_cache[root] = {"url": root, "status": "broken", "code": "hard_timeout"}
                    except Exception as e:
                        root_cache[root] = {"url": root, "status": "broken", "code": type(e).__name__}

                cached = root_cache[root]
                return url, {"root": root, "status": cached["status"], "code": cached.get("code")}

        tasks = [asyncio.ensure_future(bounded(url)) for url in broken_urls]
        done_count = 0
        total = len(tasks)

        for coro in asyncio.as_completed(tasks):
            url, result = await coro
            results[url] = result
            done_count += 1
            if done_count % 100 == 0 or done_count == total:
                fixed = sum(1 for r in results.values() if r["status"] == "ok")
                dead = sum(1 for r in results.values() if r["status"] != "ok")
                print(f"  [{done_count}/{total}] root_ok={fixed} root_dead={dead}", flush=True)

    return results


async def main():
    with open(INPUT_PATH) as f:
        resources = json.load(f)

    unique_urls = {}
    for r in resources:
        url = (r.get("website") or "").strip()
        if url and url not in unique_urls:
            unique_urls[url] = url

    print(f"Total deduplicated resources: {len(resources)}")
    print(f"Unique URLs to check: {len(unique_urls)}")
    print(f"Settings: concurrency={CONCURRENCY}, timeout={PER_REQUEST_TIMEOUT}s, retries={MAX_RETRIES}")
    print(f"\nPhase 1: Checking all URLs...", flush=True)

    url_results = await check_urls_batch(list(unique_urls.keys()))

    status_counts = Counter(r["status"] for r in url_results.values())
    print(f"\nPhase 1 results:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")

    ok_urls = [u for u, r in url_results.items() if r["status"] == "ok"]
    broken_urls = [u for u, r in url_results.items() if r["status"] == "broken"]
    suspect_urls = [u for u, r in url_results.items() if r["status"] in ("rate_limited", "suspect_blocked")]

    urls_to_check_root = broken_urls + suspect_urls
    print(f"\nPhase 2: Checking root domains for {len(urls_to_check_root)} broken/suspect URLs...", flush=True)

    root_results = {}
    if urls_to_check_root:
        root_results = await check_root_domains_batch(urls_to_check_root)

    fixed_to_root = 0
    removed = 0
    kept_suspect = 0
    url_map = {}

    for url in ok_urls:
        url_map[url] = url

    for url, result in root_results.items():
        original_status = url_results[url]["status"]
        if result.get("status") == "ok" and result.get("root"):
            url_map[url] = result["root"]
            fixed_to_root += 1
        elif original_status in ("rate_limited", "suspect_blocked"):
            url_map[url] = url
            kept_suspect += 1
        else:
            url_map[url] = ""
            removed += 1

    print(f"\nPhase 2 results:")
    print(f"  Fixed to root domain: {fixed_to_root}")
    print(f"  Removed (root also dead): {removed}")
    print(f"  Kept as-is (suspected rate limit): {kept_suspect}")

    for r in resources:
        url = (r.get("website") or "").strip()
        if url and url in url_map:
            r["website"] = url_map[url]

    with open(OUTPUT_PATH, "w") as f:
        json.dump(resources, f, indent=2)

    total_checked = len(unique_urls)
    stats = {
        "total_resources": len(resources),
        "unique_urls_checked": total_checked,
        "already_valid": len(ok_urls),
        "fixed_to_root_domain": fixed_to_root,
        "removed_dead": removed,
        "kept_suspect_rate_limited": kept_suspect,
        "empty_urls": status_counts.get("empty", 0),
        "confidence_note": (
            f"{kept_suspect} URLs kept despite failing — suspected rate-limiting. May need manual review."
            if kept_suspect > 0 else "High confidence — no suspected rate-limiting detected."
        ),
        "sample_fixes": [
            {"original": url, "fixed_to": root_results[url].get("root", "")}
            for url in urls_to_check_root[:15]
            if url in root_results and root_results[url].get("status") == "ok"
        ],
        "sample_removed": [
            {"url": url, "error": str(url_results[url].get("code"))}
            for url in broken_urls[:10]
            if url in root_results and root_results[url].get("status") != "ok"
        ]
    }

    with open(STATS_PATH, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"\nFinal summary:")
    print(f"  Already valid:  {len(ok_urls):>5} ({len(ok_urls)/total_checked*100:.1f}%)")
    print(f"  Fixed to root:  {fixed_to_root:>5} ({fixed_to_root/total_checked*100:.1f}%)")
    print(f"  Removed:        {removed:>5} ({removed/total_checked*100:.1f}%)")
    print(f"  Kept (suspect): {kept_suspect:>5} ({kept_suspect/total_checked*100:.1f}%)")
    print(f"\nFiles written:")
    print(f"  {OUTPUT_PATH}")
    print(f"  {STATS_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
