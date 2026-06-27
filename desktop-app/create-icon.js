const Jimp = require('jimp');

new Jimp(256, 256, '#2c3e50', (err, image) => {
  if (err) throw err;
  // Create a simple logo
  Jimp.loadFont(Jimp.FONT_SANS_64_WHITE).then(font => {
    image.print(font, 100, 100, 'DT');
    image.write('build/square.png', () => {
      console.log('Created build/square.png');
    });
  });
});
