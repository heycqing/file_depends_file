const fs = require("fs");
const path = require("path");
const { parse } = require("@vue/compiler-sfc");

function findVueFiles(dirPath, vueFiles = []) {
	const files = fs.readdirSync(dirPath);

	for (const file of files) {
		const filePath = path.join(dirPath, file);
		const stats = fs.statSync(filePath);

		if (stats.isDirectory()) {
			findVueFiles(filePath, vueFiles);
		} else if (stats.isFile() && filePath.endsWith(".vue")) {
			vueFiles.push(filePath);
		}
	}

	return vueFiles;
}

function getComponentImports(fileContent) {
	const parsed = parse(fileContent);

	if (parsed.descriptor.script) {
		return (
			parsed.descriptor.script.content.match(
				/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
			) || []
		);
	}

	return [];
}

function getConfigPaths() {
	const configPath = path.join(__dirname, "config.js");
	const configContent = fs.readFileSync(configPath, "utf8");
	const config = JSON.parse(configContent);

	return config.paths || [];
}

function main() {
	const configPaths = getConfigPaths();
	let vueFiles = [];

	for (const configPath of configPaths) {
		if (fs.existsSync(configPath)) {
			const stats = fs.statSync(configPath);

			if (stats.isDirectory()) {
				vueFiles = vueFiles.concat(findVueFiles(configPath));
			} else if (stats.isFile() && configPath.endsWith(".vue")) {
				vueFiles.push(configPath);
			}
		} else {
			console.error(`Invalid path: ${configPath}`);
		}
	}

	if (vueFiles.length === 0) {
		console.error("No Vue files found");
		process.exit(1);
	}

	let output = "";
	const componentCounts = {};
	const componentPaths = {};

	for (const vueFile of vueFiles) {
		const fileContent = fs.readFileSync(vueFile, "utf8");
		const componentImports = getComponentImports(fileContent);
		const excludedImports = [];

		output += `${vueFile}:\n`;

		if (componentImports.length > 0) {
			componentImports.forEach((importStatement) => {
				const [, componentName, componentPath] = importStatement.match(
					/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/
				);

				if (!componentCounts[componentName]) {
					componentCounts[componentName] = 1;
					componentPaths[componentName] = componentPath;
				} else {
					componentCounts[componentName]++;
					excludedImports.push(importStatement);
				}
			});

			if (excludedImports.length > 0) {
				output += "  Excluded Components:\n";
				excludedImports.forEach((importStatement) => {
					const [, componentName, componentPath] = importStatement.match(
						/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/
					);

					output += `    ${importStatement.replace(
						componentPath,
						componentPath
					)}\n`;
				});
			}
		} else {
			output += "  No components imported in this file\n";
		}

		output += "\n";
	}

	const sortedComponents = Object.entries(componentCounts)
		.sort(([componentNameA, countA], [componentNameB, countB]) => {
			if (countA === countB) {
				return componentNameA.localeCompare(componentNameB);
			}
			return countB - countA;
		})
		.map(([componentName]) => componentName);

	const groupedComponents = {};

	for (const componentName of sortedComponents) {
		const componentPath = componentPaths[componentName];
		const basePath = componentPath.substring(0, componentPath.lastIndexOf("/"));
		if (!groupedComponents[basePath]) {
			groupedComponents[basePath] = [];
		}
		groupedComponents[basePath].push({ componentName, componentPath });
	}

	output += "Commonly Used Components:\n";

	for (const basePath in groupedComponents) {
		const components = groupedComponents[basePath];
		output += `  ${basePath}:\n`;
		components.forEach(({ componentName, componentPath }) => {
			const count = componentCounts[componentName];
			output += `    ${componentName} (used in ${count} files) - ${componentPath}\n`;
		});
	}

	const outputPath = process.argv[2] || "output.yml";
	fs.writeFileSync(outputPath, output);
}

main();
