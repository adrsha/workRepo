#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration - modify these paths as needed
const CONFIG = {
    COMPONENTS_DIR: 'app/components',
    API_DIR: 'app/api',
    HOOKS_DIR: 'hooks/',
    HANDLERS_DIR: 'handlers/',
    SEARCH_DIRS: ['./'], // Search entire src directory recursively
    FILE_EXTENSIONS: ['.js', '.jsx', '.ts', '.tsx'],
    API_FILE_SUFFIX: 'Service.js'
};

class CodeUsageAnalyzer {
    constructor() {
        this.components = new Map();
        this.hooks = new Map();
        this.handlers = new Map();
        this.apis = new Map();
    }

    // Get all files in a directory recursively
    getFiles(dir, extensions = CONFIG.FILE_EXTENSIONS) {
        if (!fs.existsSync(dir)) {
            console.log(`⚠️  Directory not found: ${dir}`);
            return [];
        }

        const files = [];
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                files.push(...this.getFiles(fullPath, extensions));
            } else if (extensions.some(ext => item.endsWith(ext))) {
                files.push(fullPath);
            }
        }

        return files;
    }

    // Extract exports from a file
    getExports(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const exports = [];

            // Match default exports
            const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)|export\s+{\s*(\w+)\s+as\s+default\s*}/);
            if (defaultExportMatch) {
                exports.push(defaultExportMatch[1] || defaultExportMatch[2]);
            }

            // Match named exports
            const namedExports = content.matchAll(/export\s+(?:const|function|class)\s+(\w+)|export\s+{\s*([^}]+)\s*}/g);
            for (const match of namedExports) {
                if (match[1]) {
                    exports.push(match[1]);
                } else if (match[2]) {
                    const names = match[2].split(',').map(name => name.trim().split(/\s+as\s+/)[0]);
                    exports.push(...names);
                }
            }

            return exports;
        } catch (error) {
            console.log(`Error reading ${filePath}: ${error.message}`);
            return [];
        }
    }

    // Check if a name is used in file content
    isUsedInContent(name, content) {
        // Remove the export declaration to avoid false positives
        const cleanContent = content.replace(
            new RegExp(`export\\s+(?:default\\s+)?(?:const|function|class)\\s+${name}\\b.*`, 'g'),
            ''
        );

        // Check for various usage patterns
        const patterns = [
            // Import statements
            new RegExp(`import\\s+.*\\b${name}\\b.*from`, 'g'),
            new RegExp(`import\\s*{[^}]*\\b${name}\\b[^}]*}`, 'g'),
            // Function calls and usage
            new RegExp(`\\b${name}\\s*\\(`, 'g'),
            new RegExp(`\\b${name}\\b(?=\\s*[,;\\)\\}])`, 'g'),
            // JSX component usage
            new RegExp(`<${name}\\b`, 'g'),
            // Object destructuring
            new RegExp(`}\\s*=\\s*${name}\\b`, 'g'),
            new RegExp(`\\b${name}\\s*\\[`, 'g'), // Array access
            new RegExp(`\\b${name}\\.\\w+`, 'g')   // Object property access
        ];

        return patterns.some(pattern => pattern.test(cleanContent));
    }

    // Check if a name is used in the project
    isUsedInProject(name, ownFile) {
        const allFiles = [];

        // Get all files from search directories
        for (const dir of CONFIG.SEARCH_DIRS) {
            if (fs.existsSync(dir)) {
                allFiles.push(...this.getFiles(dir));
            }
        }

        // Check each file for usage
        for (const file of allFiles) {
            try {
                const content = fs.readFileSync(file, 'utf8');

                if (path.resolve(file) === path.resolve(ownFile)) {
                    // For the same file, check if it's used by OTHER exports in that file
                    if (this.isUsedInSameFile(name, content)) {
                        return true;
                    }
                } else {
                    // For other files, check normally
                    if (this.isUsedInContent(name, content)) {
                        return true;
                    }
                }
            } catch (error) {
                // Skip files that can't be read
                continue;
            }
        }

        return false;
    }

    // Check if a name is used within the same file by other components/functions
    isUsedInSameFile(name, content) {
        // Remove the export declaration of this specific item
        const withoutOwnExport = content.replace(
            new RegExp(`export\\s+(?:const|function|class)\\s+${name}\\b[^}]*}`, 'g'),
            ''
        ).replace(
            new RegExp(`export\\s+default\\s+${name}\\b`, 'g'),
            ''
        );

        // Check if the name appears in the remaining content
        const patterns = [
            new RegExp(`\\b${name}\\s*\\(`, 'g'),           // Function calls
            new RegExp(`<${name}\\b`, 'g'),                 // JSX usage
            new RegExp(`\\b${name}\\b(?=\\s*[,;\\)\\}])`, 'g'), // General usage
            new RegExp(`\\b${name}\\.\\w+`, 'g')            // Property access
        ];

        return patterns.some(pattern => pattern.test(withoutOwnExport));
    }

    // Check which APIs are used by unused items
    getApiUsageInUnusedItems(unusedItems) {
        const apiUsage = {};

        unusedItems.forEach(({ name, file, type }) => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const usedApis = [];

                this.apis.forEach((apiFile, apiName) => {
                    if (this.isUsedInContent(apiName, content)) {
                        usedApis.push(apiName);
                    }
                });

                if (usedApis.length > 0) {
                    apiUsage[`${name} (${type})`] = usedApis;
                }
            } catch (error) {
                // Skip files that can't be read
            }
        });

        return apiUsage;
    }

    // Scan all configured directories
    scanDirectories() {
        console.log('🔍 Scanning directories...\n');

        // Scan components
        const componentFiles = this.getFiles(CONFIG.COMPONENTS_DIR);
        componentFiles.forEach(file => {
            const exports = this.getExports(file);
            exports.forEach(exportName => {
                this.components.set(exportName, file);
            });
        });

        // Scan hooks
        const hookFiles = this.getFiles(CONFIG.HOOKS_DIR);
        hookFiles.forEach(file => {
            const exports = this.getExports(file);
            exports.forEach(exportName => {
                this.hooks.set(exportName, file);
            });
        });

        // Scan handlers
        const handlerFiles = this.getFiles(CONFIG.HANDLERS_DIR);
        handlerFiles.forEach(file => {
            const exports = this.getExports(file);
            exports.forEach(exportName => {
                this.handlers.set(exportName, file);
            });
        });

        // Scan API services
        const apiFiles = this.getFiles(CONFIG.API_DIR).filter(file =>
            file.endsWith(CONFIG.API_FILE_SUFFIX)
        );
        apiFiles.forEach(file => {
            const exports = this.getExports(file);
            exports.forEach(exportName => {
                this.apis.set(exportName, file);
            });
        });

        console.log(`📊 Found:`);
        console.log(`   Components: ${this.components.size}`);
        console.log(`   Hooks: ${this.hooks.size}`);
        console.log(`   Handlers: ${this.handlers.size}`);
        console.log(`   API Services: ${this.apis.size}\n`);
    }

    // Main analysis function
    analyze() {
        this.scanDirectories();

        console.log('📋 ANALYSIS RESULTS');
        console.log('='.repeat(60));

        const unusedItems = [];

        // 1. Check if there are any components
        console.log('\n🔧 COMPONENTS:');
        if (this.components.size === 0) {
            console.log('   ⚠️  No components found');
        } else {
            const unusedComponents = [];
            this.components.forEach((file, name) => {
                if (!this.isUsedInProject(name, file)) {
                    unusedComponents.push(name);
                    unusedItems.push({ name, file, type: 'component' });
                }
            });

            if (unusedComponents.length === 0) {
                console.log('   ✅ All components are being used');
            } else {
                console.log(`   ❌ ${unusedComponents.length} unused component(s):`);
                unusedComponents.forEach(name => {
                    console.log(`      • ${name} (${this.components.get(name)})`);
                });
            }
        }

        // 2. Check if all hooks are used
        console.log('\n🪝 HOOKS:');
        if (this.hooks.size === 0) {
            console.log('   ⚠️  No hooks found');
        } else {
            const unusedHooks = [];
            this.hooks.forEach((file, name) => {
                if (!this.isUsedInProject(name, file)) {
                    unusedHooks.push(name);
                    unusedItems.push({ name, file, type: 'hook' });
                }
            });

            if (unusedHooks.length === 0) {
                console.log('   ✅ All hooks are being used');
            } else {
                console.log(`   ❌ ${unusedHooks.length} unused hook(s):`);
                unusedHooks.forEach(name => {
                    console.log(`      • ${name} (${this.hooks.get(name)})`);
                });
            }
        }

        // 3. Check if all handlers are used
        console.log('\n🎯 HANDLERS:');
        if (this.handlers.size === 0) {
            console.log('   ⚠️  No handlers found');
        } else {
            const unusedHandlers = [];
            this.handlers.forEach((file, name) => {
                if (!this.isUsedInProject(name, file)) {
                    unusedHandlers.push(name);
                    unusedItems.push({ name, file, type: 'handler' });
                }
            });

            if (unusedHandlers.length === 0) {
                console.log('   ✅ All handlers are being used');
            } else {
                console.log(`   ❌ ${unusedHandlers.length} unused handler(s):`);
                unusedHandlers.forEach(name => {
                    console.log(`      • ${name} (${this.handlers.get(name)})`);
                });
            }
        }

        // 4. Check if all APIs are used
        console.log('\n🌐 API SERVICES:');
        if (this.apis.size === 0) {
            console.log('   ⚠️  No API services found');
        } else {
            const unusedApis = [];
            this.apis.forEach((file, name) => {
                if (!this.isUsedInProject(name, file)) {
                    unusedApis.push(name);
                    unusedItems.push({ name, file, type: 'api' });
                }
            });

            if (unusedApis.length === 0) {
                console.log('   ✅ All API services are being used');
            } else {
                console.log(`   ❌ ${unusedApis.length} unused API service(s):`);
                unusedApis.forEach(name => {
                    console.log(`      • ${name} (${this.apis.get(name)})`);
                });
            }
        }

        // 5. Show API usage in unused items
        console.log('\n🔗 API USAGE IN UNUSED ITEMS:');
        const apiUsageInUnused = this.getApiUsageInUnusedItems(unusedItems);

        if (Object.keys(apiUsageInUnused).length === 0) {
            console.log('   ℹ️  No unused items are using API services');
        } else {
            console.log('   📡 Unused items that still use API services:');
            Object.entries(apiUsageInUnused).forEach(([item, apis]) => {
                console.log(`      • ${item} uses: ${apis.join(', ')}`);
            });
        }

        // Summary
        console.log('\n📊 SUMMARY:');
        console.log('='.repeat(60));
        const totalUnused = unusedItems.length;
        const totalItems = this.components.size + this.hooks.size + this.handlers.size + this.apis.size;

        console.log(`   Total items analyzed: ${totalItems}`);
        console.log(`   Unused items: ${totalUnused}`);

        if (totalItems > 0) {
            console.log(`   Usage rate: ${((totalItems - totalUnused) / totalItems * 100).toFixed(1)}%`);
        }

        if (totalUnused === 0) {
            console.log('\n🎉 Excellent! No unused code found.');
        } else {
            console.log(`\n💡 Consider reviewing the ${totalUnused} unused item(s) for potential cleanup.`);
        }
    }
}

// Run the analyzer
console.log('🚀 Starting Code Usage Analysis...\n');
const analyzer = new CodeUsageAnalyzer();
analyzer.analyze();
