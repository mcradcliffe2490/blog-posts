// Usage: node generate-summaries.js
// Requires: npm install gray-matter node-fetch@2 dotenv

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
require('dotenv').config();
const fetch = require('node-fetch');

const BLOG_POSTS_DIR = path.resolve(__dirname, '../blog-posts/Posts'); // <-- Set this to your Posts dir
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = 'claude-3-haiku-20240307'; // or claude-3-sonnet-20240229, etc.

async function generateSummary(content) {
  const prompt = `Summarize the following blog post in 2-3 sentences for a blog index.\n\n${content}`;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 120,
      temperature: 0.5,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  // Claude's response is in data.content[0].text
  return data.content && data.content[0] && data.content[0].text.trim();
}

async function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  if (parsed.data.summary && parsed.data.summary.trim() !== '') {
    console.log(`✔ Summary exists for ${path.basename(filePath)}`);
    return;
  }
  console.log(`⏳ Generating summary for ${path.basename(filePath)}...`);
  const summary = await generateSummary(parsed.content);
  parsed.data.summary = summary;
  const newContent = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ Summary added for ${path.basename(filePath)}`);
}

async function main() {
  const files = fs.readdirSync(BLOG_POSTS_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    await processFile(path.join(BLOG_POSTS_DIR, file));
  }
  console.log('All done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 
