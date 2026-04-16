
# @image-charts/pcf-doughnut

[![npm version](https://img.shields.io/npm/v/%40image-charts/pcf-doughnut.svg)](https://www.npmjs.com/package/@image-charts/pcf-doughnut)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Generate signed [Image-Charts](https://image-charts.com) Doughnut Charts directly in Microsoft Power Apps Canvas Apps

## Quick Start

```bash
npm install @image-charts/pcf-doughnut
```

Import `node_modules/@image-charts/pcf-doughnut/solution/ImageChartsDoughnut.zip` into Power Apps.

```powerapps-fx
DoughnutChartGenerator.accountId = "YOUR_ACCOUNT_ID"
DoughnutChartGenerator.secretKey = "YOUR_SECRET_KEY"
DoughnutChartGenerator.data = "30,40,30"
DoughnutChartGenerator.labels = "Red,Green,Blue"
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `accountId` | Text | No* | Enterprise Account ID |
| `secretKey` | Text | No* | Enterprise Secret Key |
| `privateCloudDomain` | Text | No* | Private Cloud domain |
| `data` | Text | **Yes** | Slice values (CSV or pipe-separated) |
| `labels` | Text | No | Slice labels |
| `colors` | Text | No | Slice colors (pipe-separated hex) |
| `title` | Text | No | Chart title |
| `chartSize` | Text | No | Size (`WIDTHxHEIGHT`) |
| `advancedOptions` | Text | No | Additional parameters |
| `showDebugUrl` | Boolean | No | Display generated URL |
| `signedUrl` | Text | Output | Generated URL |

## Documentation

[https://documentation.image-charts.com/integrations/power-apps/](https://documentation.image-charts.com/integrations/power-apps/)

## License

MIT
