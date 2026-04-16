/**
 * Unit Tests for DoughnutChartGenerator PCF Component
 */

const crypto = require('crypto');

function computeHmacSha256Sync(secretKey, message) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function normalizeColors(colors) {
  if (!colors) return '';
  return colors.split('|').map(c => {
    const trimmed = c.trim();
    const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    return /^[0-9A-Fa-f]{6}$/.test(withoutHash) ? withoutHash.toUpperCase() : '';
  }).filter(c => c !== '').join('|');
}

function parseDataValues(data) {
  if (!data) return [];
  const trimmed = data.trim();
  const separator = trimmed.includes('|') ? '|' : ',';
  return trimmed.split(separator).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
}

function formatDataAwesome(values) {
  if (values.length === 0) return '';
  return 'a:' + values.join(',');
}

function parseLabels(labels) {
  if (!labels) return [];
  const trimmed = labels.trim();
  const separator = trimmed.includes('|') ? '|' : ',';
  return trimmed.split(separator).map(l => l.trim()).filter(l => l !== '');
}

function buildDoughnutChartUrl(params) {
  const { accountId, secretKey, privateCloudDomain, data, labels, colors, title, chartSize } = params;
  const host = privateCloudDomain || 'image-charts.com';
  const dataValues = parseDataValues(data);

  // cht=pd for doughnut (pie donut)
  const queryParts = ['cht=pd', 'chs=' + (chartSize || '400x300'), 'chd=' + formatDataAwesome(dataValues)];

  if (labels) {
    const labelArr = parseLabels(labels);
    if (labelArr.length > 0) queryParts.push('chl=' + labelArr.join('|'));
  }
  if (colors) {
    const normalizedColors = normalizeColors(colors);
    if (normalizedColors) queryParts.push('chco=' + normalizedColors);
  }
  if (title) queryParts.push('chtt=' + title);
  if (accountId && !privateCloudDomain) queryParts.push('icac=' + accountId);

  const queryString = queryParts.join('&');

  if (accountId && secretKey && !privateCloudDomain) {
    const signature = computeHmacSha256Sync(secretKey, queryString);
    return 'https://' + host + '/chart?' + queryString + '&ichm=' + signature;
  }
  return 'https://' + host + '/chart?' + queryString;
}

describe('Doughnut Chart URL Building', () => {
  test('should build doughnut chart URL with cht=pd', () => {
    const url = buildDoughnutChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      data: '30,40,30',
      labels: 'Red,Green,Blue'
    });

    expect(url).toContain('cht=pd');
    expect(url).toContain('chd=a:30,40,30');
    expect(url).toContain('chl=Red|Green|Blue');
    expect(url).toContain('ichm=');
  });

  test('should include colors', () => {
    const url = buildDoughnutChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      data: '30,40,30',
      colors: 'FF0000|00FF00|0000FF'
    });

    expect(url).toContain('chco=FF0000|00FF00|0000FF');
  });

  test('should include title', () => {
    const url = buildDoughnutChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      data: '50,50',
      title: 'Market Share'
    });

    expect(url).toContain('chtt=Market Share');
  });

  test('should handle Private Cloud mode', () => {
    const url = buildDoughnutChartUrl({
      privateCloudDomain: 'charts.mycompany.com',
      data: '30,40,30'
    });

    expect(url).toContain('https://charts.mycompany.com/chart');
    expect(url).not.toContain('ichm=');
  });
});

describe('Doughnut vs Pie', () => {
  test('should use pd chart type (not p)', () => {
    const url = buildDoughnutChartUrl({
      accountId: 'test',
      secretKey: 'test',
      data: '50,50'
    });

    expect(url).toContain('cht=pd');
    expect(url).not.toContain('cht=p&');
  });
});
