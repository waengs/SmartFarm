const assert = require('assert');
const http = require('http');
const app = require('./server');

let server;
const PORT = 3999;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT);
  console.log('Running backend test suite...');

  try {
    // 1. GET /api/crops
    console.log('Test 1: GET /api/crops returns seeded cards');
    const resCrops = await request('GET', '/api/crops');
    assert.strictEqual(resCrops.status, 200);
    assert.ok(Array.isArray(resCrops.data));
    const cropNames = resCrops.data.map(c => c.crop_name);
    assert.ok(cropNames.includes('Tomato'));
    assert.ok(cropNames.includes('Lettuce'));
    assert.ok(cropNames.includes('Wheat'));
    assert.ok(!cropNames.includes('Maize'), 'Maize should not be seeded initially');
    console.log('✓ Test 1 passed');

    // 2. GET /api/readings
    console.log('Test 2: GET /api/readings returns 20 valid readings');
    const resReadings = await request('GET', '/api/readings');
    assert.strictEqual(resReadings.status, 200);
    assert.strictEqual(resReadings.data.length, 20);
    const tomatoReadings = resReadings.data.filter(r => r.crop_name === 'Tomato');
    const lettuceReadings = resReadings.data.filter(r => r.crop_name === 'Lettuce');
    const wheatReadings = resReadings.data.filter(r => r.crop_name === 'Wheat');
    const maizeReadings = resReadings.data.filter(r => r.crop_name === 'Maize');
    assert.strictEqual(tomatoReadings.length, 5);
    assert.strictEqual(lettuceReadings.length, 5);
    assert.strictEqual(wheatReadings.length, 5);
    assert.strictEqual(maizeReadings.length, 5);
    console.log('✓ Test 2 passed');

    // 3. POST /api/crops validation: duplicate crop_name
    console.log('Test 3: POST /api/crops reject duplicate crop_name');
    const resDup = await request('POST', '/api/crops', {
      crop_name: 'Tomato',
      location: 'Greenhouse A',
      target_min: 50,
      target_max: 70,
      normal_water: 500
    });
    assert.strictEqual(resDup.status, 409);
    assert.strictEqual(resDup.data.error, 'crop_name already exists');
    console.log('✓ Test 3 passed');

    // 4. POST /api/crops rejection: unknown crop not in sensor feed
    console.log('Test 4: POST /api/crops reject crop not in sensor feed');
    const resInvalidCrop = await request('POST', '/api/crops', {
      crop_name: 'Carrot',
      location: 'North Field',
      target_min: 40,
      target_max: 60,
      normal_water: 300
    });
    assert.strictEqual(resInvalidCrop.status, 400);
    assert.strictEqual(resInvalidCrop.data.error, 'crop_name does not exist in sensor data');
    console.log('✓ Test 4 passed');

    // 5. POST /api/crops rejection: wrong data types (numeric strings instead of numbers)
    console.log('Test 5: POST /api/crops reject numeric strings instead of numbers');
    const resWrongType = await request('POST', '/api/crops', {
      crop_name: 'Maize',
      location: 'South Field',
      target_min: "50",
      target_max: "70",
      normal_water: 600
    });
    assert.strictEqual(resWrongType.status, 400);
    console.log('✓ Test 5 passed');

    // 6. POST /api/crops rejection: target_min >= target_max
    console.log('Test 6: POST /api/crops reject target_min >= target_max');
    const resMinMax = await request('POST', '/api/crops', {
      crop_name: 'Maize',
      location: 'South Field',
      target_min: 70,
      target_max: 50,
      normal_water: 600
    });
    assert.strictEqual(resMinMax.status, 400);
    console.log('✓ Test 6 passed');

    // 7. POST /api/crops success: create Maize
    console.log('Test 7: POST /api/crops successfully create Maize');
    const resCreateMaize = await request('POST', '/api/crops', {
      crop_name: 'Maize',
      location: 'South Field',
      target_min: 50,
      target_max: 70,
      normal_water: 600,
      notes: 'New field plot'
    });
    assert.strictEqual(resCreateMaize.status, 201);
    assert.strictEqual(resCreateMaize.data.crop_name, 'Maize');
    const maizeId = resCreateMaize.data.id;
    console.log('✓ Test 7 passed');

    // 8. PUT /api/crops/:id rejection: change crop_name
    console.log('Test 8: PUT /api/crops/:id reject changing crop_name');
    const resPutChangeName = await request('PUT', `/api/crops/${maizeId}`, {
      crop_name: 'Tomato',
      location: 'South Field',
      target_min: 50,
      target_max: 70,
      normal_water: 600
    });
    assert.strictEqual(resPutChangeName.status, 400);
    assert.strictEqual(resPutChangeName.data.error, 'crop_name cannot be changed');
    console.log('✓ Test 8 passed');

    // 9. PUT /api/crops/:id success: update allowed fields
    console.log('Test 9: PUT /api/crops/:id update allowed fields');
    const resPutSuccess = await request('PUT', `/api/crops/${maizeId}`, {
      location: 'South Field West Block',
      target_min: 52,
      target_max: 72,
      normal_water: 650,
      notes: 'Updated note'
    });
    assert.strictEqual(resPutSuccess.status, 200);
    assert.strictEqual(resPutSuccess.data.location, 'South Field West Block');
    assert.strictEqual(resPutSuccess.data.target_min, 52);
    assert.strictEqual(resPutSuccess.data.target_max, 72);
    assert.strictEqual(resPutSuccess.data.normal_water, 650);
    assert.strictEqual(resPutSuccess.data.crop_name, 'Maize');
    console.log('✓ Test 9 passed');

    // 10. DELETE /api/crops/:id
    console.log('Test 10: DELETE /api/crops/:id delete Maize');
    const resDelete = await request('DELETE', `/api/crops/${maizeId}`);
    assert.strictEqual(resDelete.status, 200);
    assert.strictEqual(resDelete.data.deleted, true);
    assert.strictEqual(resDelete.data.id, maizeId);
    console.log('✓ Test 10 passed');

    // 11. Re-create Maize works after deletion
    console.log('Test 11: Re-create Maize after deletion');
    const resRecreate = await request('POST', '/api/crops', {
      crop_name: 'Maize',
      location: 'South Field',
      target_min: 50,
      target_max: 70,
      normal_water: 600
    });
    assert.strictEqual(resRecreate.status, 201);
    // Cleanup recreate
    await request('DELETE', `/api/crops/${resRecreate.data.id}`);
    console.log('✓ Test 11 passed');

    console.log('\nALL 11 BACKEND ACCEPTANCE TESTS PASSED SUCCESSFULLY! 🎉');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  if (server) server.close();
  process.exit(1);
});
