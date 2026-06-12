#!/usr/bin/env python3
"""Parse Lincoln Craigslist HTML dumps and cluster for homelab shopping."""
import json
import re
import glob
import os
from html import unescape
from collections import defaultdict

TEMP = os.environ.get("TEMP", "/tmp")
files = glob.glob(os.path.join(TEMP, "cl-*.html"))

all_items: dict[str, dict] = {}
for fp in files:
    text = open(fp, encoding="utf-8", errors="ignore").read()
    for m in re.finditer(
        r'<a href="(https://lincoln\.craigslist\.org/sys/d/[^"]+)">\s*'
        r'<div class="title">([^<]+)</div>\s*'
        r'<div class="details">\s*<div class="price">\$([^<]+)</div>',
        text,
        re.S,
    ):
        url, title, price = m.group(1), unescape(m.group(2)), float(m.group(3).replace(",", ""))
        lid = int(re.search(r"/(\d+)\.html", url).group(1))
        lat = lon = None
        imgs = 0
        jm = re.search(r'id="ld_searchpage_results"\s*>\s*(\{.*?\})\s*</script>', text, re.S)
        if jm:
            try:
                data = json.loads(jm.group(1))
                for el in data.get("itemListElement", []):
                    item = el.get("item", {})
                    if item.get("name") == title:
                        offers = item.get("offers", {})
                        if float(offers.get("price", -1)) == price:
                            geo = offers.get("availableAtOrFrom", {}).get("geo", {})
                            lat, lon = geo.get("latitude"), geo.get("longitude")
                            imgs = len(item.get("image") or [])
            except json.JSONDecodeError:
                pass
        all_items[url] = {
            "title": title,
            "price": price,
            "url": url,
            "id": lid,
            "lat": lat,
            "lon": lon,
            "images": imgs,
        }

DEALER_COORD = (40.851, -96.711)  # bulk refurb seller cluster


def is_dealer(item: dict) -> bool:
    if item["lat"] is None:
        return "Office 2021" in item["title"] and item["images"] >= 8
    return abs(item["lat"] - DEALER_COORD[0]) < 0.01 and abs(item["lon"] - DEALER_COORD[1]) < 0.01


def parse_specs(title: str) -> dict:
    t = title.lower()
    ram = None
    rm = re.search(r"(\d+)\s*gb\s*ram", t)
    if rm:
        ram = int(rm.group(1))
    elif "16gb" in t.replace(" ", ""):
        ram = 16
    elif "8gb" in t.replace(" ", ""):
        ram = 8
    elif "4gb" in t.replace(" ", ""):
        ram = 4
    elif "32gb" in t.replace(" ", ""):
        ram = 32
    has_ssd = "ssd" in t
    has_hdd = "hdd" in t or "500gb" in t or "1tb" in t or "750gb" in t
    is_laptop = any(k in t for k in ("latitude", "chromebook", "macbook", "surface", "ultrabook", "probook", "pavilion g", "15.6", "14\"", "13"))
    is_monitor = "monitor" in t and "gaming pc" not in t
    is_gaming = "gaming" in t or "rtx" in t or "gtx" in t
    is_server = "server" in t or "xeon" in t or "precision t" in t or "workstation" in t
    is_mac = "mac mini" in t or "macbook" in t or ("apple" in t and "computer" in t)
    is_vague = len(title) < 25 or title.strip().lower() in ("apple computer", "gaming pc", "lenovo pc")
    is_parts = "for parts" in t or ("parts" in t and "pc" in t)
    gen_old = any(k in t for k in ("790", "990", "3020", "7010", "3470", "6500", "3770"))
    i7 = "i7" in t or "xeon" in t
    i5 = "i5" in t or "quad core" in t or "6-core" in t or "6 core" in t
    return {
        "ram": ram,
        "has_ssd": has_ssd,
        "has_hdd": has_hdd,
        "is_laptop": is_laptop,
        "is_monitor": is_monitor,
        "is_gaming": is_gaming,
        "is_server": is_server,
        "is_mac": is_mac,
        "is_vague": is_vague,
        "is_parts": is_parts,
        "gen_old": gen_old,
        "i7": i7,
        "i5": i5,
    }


def filter_reason(item: dict, specs: dict) -> str | None:
    # Stale: CL IDs below ~7936M are older bulk reposts in this market snapshot
    if item["id"] < 7936000000 and is_dealer(item):
        return "stale_dealer_repost"
    if specs["is_vague"] and item["images"] <= 1:
        return "vague_low_info"
    if specs["is_gaming"] and item["price"] >= 1000:
        return "overkill_price"
    if specs["is_laptop"] and not specs["is_mac"]:
        return "laptop_not_ideal_host"
    if is_dealer(item) and specs["gen_old"] and not specs["has_ssd"] and (specs["ram"] or 8) <= 8:
        if item["price"] > 130:
            return "dealer_overpriced_old_gen"
    if "office 2021" in item["title"].lower() and specs["gen_old"] and item["price"] >= 200:
        return "office_bundle_markup"
    return None


def cluster(item: dict, specs: dict) -> str:
    if specs["is_monitor"]:
        return "upgrades_peripherals"
    if specs["is_parts"]:
        return "parts_base_project"
    if specs["is_mac"]:
        return "good_for_starting" if "mac mini" in item["title"].lower() else "parts_base_project"
    if specs["is_gaming"] and item["price"] < 800:
        return "good_for_starting"
    if specs["ram"] and specs["ram"] >= 16 and (specs["has_ssd"] or specs["i7"]):
        return "good_for_starting"
    if specs["ram"] and specs["ram"] >= 8 and item["price"] <= 180:
        return "good_for_starting"
    if item["price"] <= 120 or (specs["ram"] and specs["ram"] <= 4):
        return "parts_base_project"
    if is_dealer(item) and specs["gen_old"]:
        return "parts_base_project"
    if specs["is_server"]:
        return "good_for_starting" if specs["ram"] and specs["ram"] >= 16 else "parts_base_project"
    return "good_for_starting"


# Dedupe dealer spam: keep cheapest per normalized model family
def model_key(title: str) -> str:
    t = title.lower()
    for pat in [
        r"optiplex\s*\d+",
        r"dell\s*70\d\d",
        r"dell\s*79\d",
        r"dell\s*99\d",
        r"dell\s*7040",
        r"precision",
        r"hp pro:",
        r"vostro",
        r"small hp",
        r"small dell",
        r"mac mini",
    ]:
        m = re.search(pat, t)
        if m:
            return m.group(0)
    return t[:40]


kept: dict[str, dict] = {}
removed_dup: list[dict] = []
for url, item in sorted(all_items.items(), key=lambda x: x[1]["price"]):
    specs = parse_specs(item["title"])
    mk = model_key(item["title"])
    reason = filter_reason(item, specs)
    item["specs"] = specs
    item["filter_reason"] = reason
    item["cluster"] = cluster(item, specs) if not reason else "filtered_out"
    if reason:
        continue
    if is_dealer(item):
        prev = kept.get(mk)
        if prev and prev["price"] <= item["price"]:
            removed_dup.append({**item, "filter_reason": "duplicate_dealer_listing"})
            continue
    kept[mk] = item

clusters = defaultdict(list)
for item in kept.values():
    clusters[item["cluster"]].append(item)

filtered = [i for i in all_items.values() if i.get("filter_reason") or i["url"] not in {v["url"] for v in kept.values()}]

print(json.dumps({
    "total_raw": len(all_items),
    "kept": len(kept),
    "clusters": {k: sorted(v, key=lambda x: x["price"]) for k, v in clusters.items()},
}, indent=2, default=str))
