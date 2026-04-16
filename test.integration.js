/**
 * Integration Tests for DoughnutChartGenerator PCF Component
 * Black-box tests against the real Image-Charts API.
 * Based on test scenarios from the Zapier connector.
 */

const crypto = require('crypto');
const https = require('https');

const ACCOUNT_ID = process.env.IMAGE_CHARTS_ACCOUNT_ID;
const SECRET_KEY = process.env.IMAGE_CHARTS_SECRET_KEY;
const PRIVATE_CLOUD_DOMAIN = process.env.IMAGE_CHARTS_PRIVATE_CLOUD_DOMAIN;
const USER_AGENT = process.env.IMAGE_CHARTS_USER_AGENT || 'pcf-image-charts-doughnut/1.0.0-test';

const describeIfCredentials = ACCOUNT_ID && SECRET_KEY ? describe : describe.skip;
const describeIfPrivateCloud = PRIVATE_CLOUD_DOMAIN ? describe : describe.skip;

function computeHmacSha256Sync(secretKey, message) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function buildSignedDoughnutChartUrl(params) {
  const { accountId, secretKey, data, labels, colors, chartSize, chartType } = params;
  const cht = chartType || 'pd';
  const searchParams = new URLSearchParams();
  searchParams.append('cht', cht);
  searchParams.append('chs', chartSize || '400x300');
  searchParams.append('chd', 'a:' + data);
  if (labels) searchParams.append('chl', labels);
  if (colors) searchParams.append('chco', colors);
  searchParams.append('icac', accountId);
  const signature = computeHmacSha256Sync(secretKey, searchParams.toString());
  searchParams.append('ichm', signature);
  return 'https://image-charts.com/chart?' + searchParams.toString();
}

function buildPrivateCloudDoughnutChartUrl(params) {
  const { domain, data, labels, colors, chartSize, chartType } = params;
  const cht = chartType || 'pd';
  const searchParams = new URLSearchParams();
  searchParams.append('cht', cht);
  searchParams.append('chs', chartSize || '400x300');
  searchParams.append('chd', 'a:' + data);
  if (labels) searchParams.append('chl', labels);
  if (colors) searchParams.append('chco', colors);
  const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;
  return baseUrl + '/chart?' + searchParams.toString();
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ============================================================
// URL Generation Tests
// ============================================================

describe('URL Generation', () => {
  const testAccountId = 'test_account';
  const testSecretKey = 'test_secret_key_123';

  test('should generate correct URL structure for doughnut chart (pd)', () => {
    const url = buildSignedDoughnutChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '30,40,30',
      chartSize: '300x300'
    });
    expect(url).toContain('cht=pd');
    expect(url).toContain('chs=300x300');
    expect(url).toContain('chd=a%3A30%2C40%2C30');
    expect(url).toContain('icac=' + testAccountId);
    expect(url).toContain('ichm=');
  });

  test('should generate correct URL for concentric doughnut (pc)', () => {
    const url = buildSignedDoughnutChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '25,25,25,25',
      chartType: 'pc'
    });
    expect(url).toContain('cht=pc');
  });

  test('should include labels when provided', () => {
    const url = buildSignedDoughnutChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '30,40,30',
      labels: 'A|B|C'
    });
    expect(url).toContain('chl=A%7CB%7CC');
  });

  test('should include colors when provided', () => {
    const url = buildSignedDoughnutChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '30,40,30',
      colors: 'FF0000|00FF00|0000FF'
    });
    expect(url).toContain('chco=FF0000%7C00FF00%7C0000FF');
  });

  test('HMAC signature should be deterministic', () => {
    const params = {
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '30,40,30',
      chartSize: '300x300'
    };
    const url1 = buildSignedDoughnutChartUrl(params);
    const url2 = buildSignedDoughnutChartUrl(params);
    expect(url1).toBe(url2);
  });

  test('Private Cloud URL should not include icac or ichm', () => {
    const url = buildPrivateCloudDoughnutChartUrl({
      domain: 'https://private.example.com',
      data: '30,40,30'
    });
    expect(url).not.toContain('icac=');
    expect(url).not.toContain('ichm=');
  });
});

// ============================================================
// API Integration Tests - Enterprise Mode
// ============================================================

describeIfCredentials('Enterprise Mode - Doughnut Charts', () => {
  test('should return 200 for standard doughnut chart (pd)', () => {
    const url = buildSignedDoughnutChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '30,40,30',
      labels: 'A|B|C'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for concentric doughnut (pc)', () => {
    const url = buildSignedDoughnutChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '25,25,25,25',
      chartType: 'pc'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 with custom colors', () => {
    const url = buildSignedDoughnutChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '25,25,25,25',
      colors: 'FF0000|00FF00|0000FF|FFFF00'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should handle two slices (50/50)', () => {
    const url = buildSignedDoughnutChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '50,50',
      labels: 'Yes|No'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should handle many slices', () => {
    const url = buildSignedDoughnutChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '10,10,10,10,10,10,10,10,10,10'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 403 for invalid signature', () => {
    const url = 'https://image-charts.com/chart?cht=pd&chs=400x300&chd=a%3A30%2C40%2C30&icac=' + ACCOUNT_ID + '&ichm=invalid_signature';
    return fetchUrl(url).then((response) => {
      expect([400, 403]).toContain(response.statusCode);
    });
  }, 15000);
});

// ============================================================
// Private Cloud Mode Tests
// ============================================================

describeIfPrivateCloud('Private Cloud Mode - Doughnut Charts', () => {
  test('should return 200 for standard doughnut chart (pd)', () => {
    const url = buildPrivateCloudDoughnutChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '30,40,30',
      labels: 'A|B|C'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for concentric doughnut (pc)', () => {
    const url = buildPrivateCloudDoughnutChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '25,25,25,25',
      chartType: 'pc'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 with custom colors', () => {
    const url = buildPrivateCloudDoughnutChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '25,25,25,25',
      colors: 'FF0000|00FF00|0000FF|FFFF00'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should handle two slices (50/50)', () => {
    const url = buildPrivateCloudDoughnutChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '50,50',
      labels: 'Yes|No'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should handle many slices', () => {
    const url = buildPrivateCloudDoughnutChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '10,10,10,10,10,10,10,10,10,10'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);
});

// ============================================================
// Performance Tests
// ============================================================

describeIfCredentials('Performance - Enterprise', () => {
  test('should respond within 5 seconds', () => {
    const startTime = Date.now();
    const url = buildSignedDoughnutChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '30,40,30'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(Date.now() - startTime).toBeLessThan(5000);
    });
  }, 10000);
});

describeIfPrivateCloud('Performance - Private Cloud', () => {
  test('should respond within 5 seconds', () => {
    const startTime = Date.now();
    const url = buildPrivateCloudDoughnutChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '30,40,30'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(Date.now() - startTime).toBeLessThan(5000);
    });
  }, 10000);
});
