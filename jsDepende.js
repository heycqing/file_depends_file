const acorn = require("acorn");
const walk = require("acorn-walk");
const fs = require("fs");
const { parse } = require("@vue/compiler-sfc");

function getJsDependencies(fileContent) {
	// Skip empty files
	if (!fileContent.trim()) {
		return [];
	}

	const dependencies = [];

	try {
		const ast = acorn.parse(fileContent, {
			sourceType: "module",
			ecmaVersion: 2020,
		});

		walk.simple(ast, {
			ImportDeclaration(node) {
				const importPath = node.source.value;
				if (importPath.endsWith(".js")) {
					dependencies.push(importPath);
				}
			},
			CallExpression(node) {
				if (
					node.callee.name === "require" &&
					node.arguments.length === 1 &&
					node.arguments[0].type === "Literal"
				) {
					const requirePath = node.arguments[0].value;
					if (requirePath.endsWith(".js")) {
						dependencies.push(requirePath);
					}
				}
			},
			ImportExpression(node) {
				if (node.source.type === "Literal") {
					const importPath = node.source.value;
					if (importPath.endsWith(".js")) {
						dependencies.push(importPath);
					}
				}
			},
		});
	} catch (error) {
		console.error(`Error parsing file content: ${error}`);
		console.error(`File content: \n${fileContent}`);
	}

	return dependencies;
}

function getJsContentFromVueFile(fileContent) {
	const parsed = parse(fileContent);
	return parsed.descriptor.script ? parsed.descriptor.script.content : "";
}

function processJsImports(files, getDependencies) {
	let output = "";

	for (const file of files) {
		const fileContent = fs.readFileSync(file, "utf8");
		const jsContent = file.endsWith(".vue")
			? getJsContentFromVueFile(fileContent)
			: fileContent;
		const dependencies = getDependencies(jsContent);

		output += `'${file}':\n`;

		for (const dependency of dependencies) {
			output += `  import '${dependency}'\n`;
		}

		output += "\n";
	}

	return output;
}

module.exports = {
	getJsDependencies,
	processJsImports,
};
