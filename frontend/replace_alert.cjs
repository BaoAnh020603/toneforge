const fs = require('fs');
const path = require('path');
const baseDir = path.resolve(__dirname, 'src');

const files = [
  path.join(baseDir, 'pages', 'VoiceRangeCheck.tsx'),
  path.join(baseDir, 'pages', 'dashboard', 'DashboardAdmin.tsx'),
  path.join(baseDir, 'pages', 'dashboard', 'DashboardAIEvaluate.tsx'),
  path.join(baseDir, 'pages', 'dashboard', 'DashboardHome.tsx'),
  path.join(baseDir, 'pages', 'dashboard', 'DashboardPronunciation.tsx'),
  path.join(baseDir, 'pages', 'dashboard', 'DashboardQuests.tsx'),
  path.join(baseDir, 'pages', 'dashboard', 'DashboardSettings.tsx'),
  path.join(baseDir, 'pages', 'dashboard', 'DashboardUpload.tsx'),
  path.join(baseDir, 'pages', 'results', 'ResultsScreen.tsx')
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Determine path to context based on file depth
  // pages/VoiceRangeCheck.tsx -> ../contexts/AlertContext
  // pages/dashboard/... -> ../../contexts/AlertContext
  // pages/results/... -> ../../contexts/AlertContext
  const relativePath = file.includes('/dashboard/') || file.includes('/results/') ? '../../contexts/AlertContext' : '../contexts/AlertContext';
  
  const importStatement = `import { useAlert } from "${relativePath}";\n`;
  
  if (!content.includes('useAlert')) {
    // Add import after other imports
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, endOfLastImport + 1) + importStatement + content.slice(endOfLastImport + 1);
  }

  // Inject hook into component
  // We need to find the main component declaration
  const componentMatch = content.match(/export default function \w+\([^)]*\) \{|const \w+ = \([^)]*\) => \{/);
  
  if (componentMatch && !content.includes('const { showAlert } = useAlert();')) {
    const insertPos = componentMatch.index + componentMatch[0].length;
    content = content.slice(0, insertPos) + '\n  const { showAlert } = useAlert();' + content.slice(insertPos);
  }

  // Replace alert( with showAlert(
  // Need to be careful not to replace things indiscriminately, but alert( is standard.
  content = content.replace(/\balert\(/g, 'showAlert(');

  fs.writeFileSync(file, content);
  console.log('Updated', file);
});
