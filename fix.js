const fs = require('fs'); let data = fs.readFileSync('index.html', 'utf8'); data = data.replace(/[”]/g, '"'); fs.writeFileSync('index.html', data);
