from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app and capture the main page
        page.goto("http://localhost:5173")
        page.wait_for_selector("text=Visuals")
        page.screenshot(path="jules-scratch/verification/01_main_page.png")

        # 2. Capture the redesigned header
        header = page.locator("header")
        header.screenshot(path="jules-scratch/verification/02_header.png")

        # 3. Capture the improved image grid
        image_grid = page.locator(".grid")
        image_grid.screenshot(path="jules-scratch/verification/03_image_grid.png")

        # 4. Navigate to the upload form and capture it
        page.click("text=Upload")
        page.wait_for_selector("text=Upload Images")
        upload_form = page.locator("main")
        upload_form.screenshot(path="jules-scratch/verification/04_upload_form.png")

        # 5. Navigate back to the gallery and open the image modal
        page.click("text=Gallery")
        page.wait_for_selector(".grid")
        page.locator(".grid > div:first-child").click()
        page.wait_for_selector("h2")
        modal = page.locator("div[role='dialog']")
        modal.screenshot(path="jules-scratch/verification/05_image_modal.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)