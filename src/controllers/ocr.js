const path = require('path');

// This safely points to root eng.traineddata file inside Vercel's runtime environment
const trainedDataPath = path.join(process.cwd(), 'eng.traineddata'); 
