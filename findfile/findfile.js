const fs = require("fs");
const path = require("path");
const { parse } = require("@vue/compiler-sfc");
const { processJsImports, getJsDependencies } = require("./jsDepende.js");

function findFiles(dirPath, vueFiles = [], jsFiles = []) {
	const files = fs.readdirSync(dirPath);

	for (const file of files) {
		const filePath = path.join(dirPath, file);
		const stats = fs.statSync(filePath);

		if (stats.isDirectory()) {
			findFiles(filePath, vueFiles, jsFiles);
		} else if (stats.isFile() && filePath.endsWith(".vue")) {
			vueFiles.push(filePath);
		} else if (stats.isFile() && filePath.endsWith(".js")) {
			jsFiles.push(filePath);
		}
	}

	return { vueFiles, jsFiles };
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
	const configPath = path.join(__dirname, "../config/config.js");
	const configContent = fs.readFileSync(configPath, "utf8");
	const config = JSON.parse(configContent);

	return config.paths || [];
}

function processDependencies(files, getDependencies) {
	let output = "";
	const componentCounts = {};
	const componentPaths = {};

	for (const file of files) {
		const fileContent = fs.readFileSync(file, "utf8");
		const dependencies = getDependencies(fileContent);

		output += `${file}:\n`;

		for (const dependency of dependencies) {
			const [, componentName, componentPath] = dependency.match(
				/(?:import\s+(\w+)\s+from\s+|require\()['"]([^'"]+)['"]/
			);

			output += `  import '${dependency}'\n`;

			if (!componentCounts[componentName]) {
				componentCounts[componentName] = 1;
				componentPaths[componentName] = componentPath;
			} else {
				componentCounts[componentName]++;
			}
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

	return output;
}

function main() {
	const configPaths = getConfigPaths();
	let vueFiles = [];
	let jsFiles = [];

	for (const configPath of configPaths) {
		if (fs.existsSync(configPath)) {
			const stats = fs.statSync(configPath);

			if (stats.isDirectory()) {
				const { vueFiles: dirVueFiles, jsFiles: dirJsFiles } =
					findFiles(configPath);
				vueFiles = vueFiles.concat(dirVueFiles);
				jsFiles = jsFiles.concat(dirJsFiles);
			} else if (stats.isFile() && configPath.endsWith(".vue")) {
				vueFiles.push(configPath);
			} else if (stats.isFile() && configPath.endsWith(".js")) {
				jsFiles.push(configPath);
			}
		} else {
			console.error(`Invalid path: ${configPath}`);
		}
	}

	if (vueFiles.length === 0 && jsFiles.length === 0) {
		console.error("No Vue or JS files found");
		process.exit(1);
	}

	// const vueOutput = processDependencies(vueFiles, getComponentImports);
	// fs.writeFileSync("../output/vue_output.yml", vueOutput);

	// const jsImportsOutput = processJsImports(
	// 	[...vueFiles, ...jsFiles],
	// 	getJsDependencies
	// );
	// fs.writeFileSync("../output/js_imports_output.yml", jsImportsOutput);

	const outputFolderPath = path.join(__dirname, "../output");

	const vueOutputPath = path.join(outputFolderPath, "vue_output.yml");
	const vueOutput = processDependencies(vueFiles, getComponentImports);
	fs.writeFileSync(vueOutputPath, vueOutput);

	const jsImportsOutputPath = path.join(outputFolderPath, "js_imports_output.yml");
	const jsImportsOutput = processJsImports([...vueFiles, ...jsFiles], getJsDependencies);
	fs.writeFileSync(jsImportsOutputPath, jsImportsOutput);

}


module.exports = {
	main
};
