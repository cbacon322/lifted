const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const sharedRoot = path.resolve(workspaceRoot, 'shared');

const config = getDefaultConfig(projectRoot);

// Watch both the project and shared folders
config.watchFolders = [sharedRoot, workspaceRoot];

// Set the project root explicitly
config.projectRoot = projectRoot;

// Let Metro know where to resolve packages from
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure shared folder can use mobile's node_modules for dependencies like firebase
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
