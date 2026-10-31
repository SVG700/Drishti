const https = require('https');

const urls = [
  'https://tile.openstreetmap.org/3/5/3.png',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/3/3/5',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/3/3/5',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/3/3/5'
];

urls.forEach(url => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 DRISHTI-SIH' } }, res => {
    console.log(url, '--> Status:', res.statusCode, 'Content-Type:', res.headers['content-type'], 'Length:', res.headers['content-length']);
  }).on('error', e => console.log(url, '--> Error:', e.message));
});
