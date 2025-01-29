const mediumToMarkdown = require('medium-to-markdown');
 
// Enter url here
mediumToMarkdown.convertFromUrl('https://medium.com/@mcradcliffe/oat-milk-has-forever-changed-the-lactose-free-game-b1800646f7ad')
.then(function (markdown) {
  console.log(markdown); //=> Markdown content of medium post
});