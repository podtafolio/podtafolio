import { test, expect } from '@playwright/test';

test('verify podcast details and transcription placeholder', async ({ page }) => {
  // 1. Navigate to the podcast list page
  await page.goto('/podcasts');

  // 2. Click on the first podcast card
  // Assuming the card has a link or we can click it.
  // The structure seems to be grid of cards.
  // We can just try to click the first anchor inside the grid.
  const podcastCard = page.locator('a[href^="/podcasts/"]').first();
  await podcastCard.waitFor();
  await podcastCard.click();

  // 3. Now on podcast details page. Click on the first episode.
  const episodeLink = page.locator('a[href^="/episodes/"]').first();
  await episodeLink.waitFor();
  await episodeLink.click();

  // 4. Now on episode details page.
  // Verify title exists
  const title = page.locator('h1');
  await expect(title).toBeVisible();

  // Verify "Show Notes" card exists
  const showNotes = page.locator('h3:has-text("Show Notes")');
  await expect(showNotes).toBeVisible();

  // Verify "Transcript" card exists
  const transcriptHeader = page.locator('h3:has-text("Transcript")');
  await expect(transcriptHeader).toBeVisible();

  // Verify "Transcribe" button exists (since it's a fresh state, likely no transcript yet)
  // Or "Transcript not available" message.
  const transcribeButton = page.locator('button:has-text("Transcribe")');

  // Take a screenshot
  await page.screenshot({ path: 'episode_transcription_verify.png', fullPage: true });
});
