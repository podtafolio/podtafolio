from playwright.sync_api import Page, expect, sync_playwright

def test_topics_feature(page: Page):
    # 1. Go to Home Page
    print("Navigating to home page...")
    page.goto("http://localhost:3000")

    # Wait for content to load
    page.wait_for_selector("h1")

    # 2. Verify Trending Topics section
    print("Verifying Trending Topics section...")
    expect(page.get_by_text("Trending Topics")).to_be_visible()

    # 3. Verify Verification Topic is present
    topic_link = page.get_by_role("link", name="Verification Topic")
    expect(topic_link).to_be_visible()

    # Screenshot Home Page
    page.screenshot(path="verification/home_page.png")

    # 4. Click the topic
    print("Clicking topic...")
    topic_link.click()

    # 5. Verify Topic Detail Page
    print("Verifying Topic Detail Page...")
    # Expect h1 to be "Verification Topic"
    expect(page.get_by_role("heading", name="Verification Topic")).to_be_visible()

    # Expect "Related Episodes"
    expect(page.get_by_text("Related Episodes")).to_be_visible()

    # Expect the episode title
    expect(page.get_by_text("Test Episode about Verification")).to_be_visible()

    # 6. Screenshot Topic Page
    page.screenshot(path="verification/topic_page.png")
    print("Verification complete.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_topics_feature(page)
        except Exception as e:
            print(f"Error: {e}")
            try:
                page.screenshot(path="verification/error.png")
            except:
                pass
            raise
        finally:
            browser.close()
