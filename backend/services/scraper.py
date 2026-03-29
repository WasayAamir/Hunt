import asyncio
from concurrent.futures import ThreadPoolExecutor
import httpx
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/123.0.0.0 Safari/537.36"
)

_HEADERS = {
    "User-Agent": _USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

_MIN_CONTENT_LENGTH = 400


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)[:8000]


async def _scrape_with_httpx(url: str) -> str:
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        response = await client.get(url, headers=_HEADERS)
        response.raise_for_status()
    return _extract_text(response.text)


def _scrape_with_playwright_sync(url: str) -> str:
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent=_USER_AGENT,
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            java_script_enabled=True,
        )
        # Remove webdriver flag so sites don't detect headless Chrome
        ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        page = ctx.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            # Give JS a moment to render content
            page.wait_for_timeout(2000)
            html = page.content()
        finally:
            browser.close()
    return _extract_text(html)


async def scrape_job_posting(url: str) -> str:
    """Fetch and extract text from a job posting URL.
    Falls back to a headless browser, then returns empty string so
    the caller can still create a job entry with manual/mock data."""
    try:
        text = await _scrape_with_httpx(url)
        if len(text) >= _MIN_CONTENT_LENGTH:
            return text
    except Exception:
        pass

    try:
        loop = asyncio.get_running_loop()
        with ThreadPoolExecutor() as pool:
            text = await loop.run_in_executor(pool, _scrape_with_playwright_sync, url)
        if text:
            return text
    except Exception:
        pass

    # If all scraping fails, return empty string — mock AI still works
    return ""
