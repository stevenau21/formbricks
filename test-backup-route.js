const http = require('http');

// We need to find a valid environment ID to test the page.
// Since we can't easily login via script without a lot of work, we'll try to hit the page and see if we get a 404 or a redirect (307) or 403.
// If we get a 404, it means the route doesn't exist.
// If we get a 307 (redirect to login) or 403, it means the route exists but is protected.

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/environments/cmjoox8wp0003r1010lvcv06m/project/backup', // Using the ID from the screenshot
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    // console.log(`BODY: ${chunk}`); // Body might be large
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
