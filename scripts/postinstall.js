#!/usr/bin/env node
/**
 * Post-install script for @image-charts/pcf-doughnut
 */

const path = require('path');
const fs = require('fs');

const packageDir = path.dirname(__dirname);
const solutionPath = path.join(packageDir, 'solution', 'ImageChartsDoughnut.zip');

console.log(`
===============================================================================
  Image-Charts Doughnut Chart Generator for Power Apps
===============================================================================

The PCF solution has been installed successfully!

NEXT STEPS:

1. MANUAL IMPORT (Recommended for Production):
   - Go to https://make.powerapps.com
   - Select your environment
   - Navigate to Solutions > Import
   - Select the solution file:
     ${solutionPath}

2. DIRECT PUSH (For Development):
   - First, authenticate with your Power Platform environment:
     pac auth create --url https://your-org.crm.dynamics.com

   - Then push the component:
     npx @image-charts/pcf-doughnut push --publisher-prefix ic

DOCUMENTATION:
  https://documentation.image-charts.com/integrations/power-apps/

SUPPORT:
  https://github.com/image-charts/pcf-doughnut/issues

===============================================================================
`);

if (fs.existsSync(solutionPath)) {
  console.log('Solution file verified at:', solutionPath);
} else {
  console.warn('WARNING: Solution file not found. You may need to build it first.');
  console.log('Run: npm run build');
}
