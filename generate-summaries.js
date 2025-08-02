// Usage: node generate-summaries.js
// Requires: npm install gray-matter node-fetch@2 dotenv

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
require('dotenv').config();
const fetch = require('node-fetch');

const BLOG_POSTS_DIR = path.resolve(__dirname, 'Posts');
const METADATA_FILE = path.resolve(__dirname, 'metadata.json');
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = 'claude-3-haiku-20240307'; // or claude-3-sonnet-20240229, etc.

async function generateSummary(content) {
  const prompt = `Summarize the following blog post in 2-3 sentences for a blog index.
    use a more informal tone. Do not use any emojis. Only output the summary, no other text.\n\n${content}`;
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

async function processFile(filePath, metadata) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const filename = path.basename(filePath, '.md');
  
  if (metadata[filename] && metadata[filename].summary && metadata[filename].summary.trim() !== '') {
    console.log(`✔ Summary exists for ${filename}`);
    return metadata;
  }
  
  console.log(`⏳ Generating summary for ${filename}...`);
  const summary = await generateSummary(parsed.content);
  
  if (!metadata[filename]) {
    metadata[filename] = {};
  }
  metadata[filename].summary = summary;
  
  console.log(`✅ Summary added for ${filename}`);
  return metadata;
}

async function main() {
  // Load existing metadata
  let metadata = {};
  if (fs.existsSync(METADATA_FILE)) {
    const metadataContent = fs.readFileSync(METADATA_FILE, 'utf8');
    metadata = JSON.parse(metadataContent);
  }
  
  const files = fs.readdirSync(BLOG_POSTS_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    metadata = await processFile(path.join(BLOG_POSTS_DIR, file), metadata);
  }
  
  // Save updated metadata
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 4), 'utf8');
  console.log('All done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 
