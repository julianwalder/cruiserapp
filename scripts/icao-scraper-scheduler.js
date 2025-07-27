const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function getNextScheduledDate() {
  try {
    const summaryPath = path.join(__dirname, 'icao-extraction-summary-v8.json');
    if (!fs.existsSync(summaryPath)) return null;
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    if (!summary.nextScheduledUpdate) return null;
    const date = new Date(summary.nextScheduledUpdate);
    date.setDate(date.getDate() + 1);
    return date;
  } catch (e) {
    return null;
  }
}

function scheduleNextRun() {
  const nextDate = getNextScheduledDate();
  if (!nextDate) {
    console.log('No next scheduled update found. Skipping scheduling.');
    return;
  }
  const now = new Date();
  if (nextDate <= now) {
    runScraper();
    return;
  }
  const cronTime = `${nextDate.getMinutes()} ${nextDate.getHours()} ${nextDate.getDate()} ${nextDate.getMonth() + 1} *`;
  console.log('Scheduling next ICAO scrape for:', nextDate, 'with cron:', cronTime);
  cron.schedule(cronTime, runScraper, { scheduled: true });
}

function runScraper() {
  console.log('Running ICAO scraper...');
  exec('node scripts/scrape-icao-comprehensive-v8.js', (err, stdout, stderr) => {
    if (err) {
      console.error('Scraper failed:', err, stderr);
    } else {
      console.log('Scraper output:', stdout);
      scheduleNextRun();
    }
  });
}

scheduleNextRun(); 