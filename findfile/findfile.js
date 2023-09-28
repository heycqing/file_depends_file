const fs = require("fs");
const path = require("path");
// const esprima = require('esprima');
const { parse } = require("@vue/compiler-sfc");
const { processJsImports, getJsDependencies } = require("./jsDepende.js");
const parser = require('@babel/parser');

// 驼峰转中划线, 第一个字母不加中划线
function camelize2middle (str) {
	let camelizeRE = /[A-Z]/g
	return str.replace(camelizeRE, (all, letter) => {
	  return all ? `${letter === 0 ? '' : '-' }${all.toLowerCase()}` : ''
	})
  }

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
// 正则匹配到对应的组件
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

function getConfig() {
	const configPath = path.join(__dirname, "../config/config.js");
	const configContent = fs.readFileSync(configPath, "utf8");
	const config = JSON.parse(configContent);

	return config
}

// 解析 vue 文件中的script脚本内容成 AST
// 目的是为了找到 component 属性
// 方便查看 AST 树结构的地址： https://astexplorer.net/
function isDeclaredInComponents(scriptContent, serachComponentName) {
	
    // const ast = esprima.parseScript(scriptContent, { tolerant: true });
	// 针对 esnext 语法优化
	const ast = parser.parse(scriptContent, {
        sourceType: 'module',
        plugins: ['jsx', 'dynamicImport', 'classProperties', 'privateMethods']
        // 可能需要更多的插件，取决于你的代码使用了哪些特性
    });

    let isDeclared = false;

    // 遍历 AST 节点找到 components 声明
    const checkNode = (node) => {
        if (node.type === 'Property' && node.key.name === 'components') {
            if (node.value.type === 'ObjectExpression') {
                for (const property of node.value.properties) {
                    if (property.key.name === serachComponentName) {
                        isDeclared = true;
                        break;
                    }
                }
            }
        }
    };

    const explore = (node) => {
        checkNode(node);
        for (const key in node) {
            if (node[key] && typeof node[key] === 'object') {
                explore(node[key]);
            }
        }
    };

    explore(ast);
    return isDeclared;
}

function processDependencies(files, getDependencies) {
	let output = "";
	const componentCounts = {};
	const componentPaths = {};

	// 判断是否有配置 serachComponentName
	let shouldSerachComponentName = getConfig().serachComponentName || ''
	// 新功能 - 用于筛选comp
	const filesWithBDTreeSelect = [];
	let unusedBDTreeSelectOutput = shouldSerachComponentName !== '' ? `文件导入组件 ${shouldSerachComponentName}:\n` : ''; 

	console.log(":shouldSerachComponentName !== '' ", shouldSerachComponentName !== '')

	for (const file of files) {
		const fileContent = fs.readFileSync(file, "utf8");
		const dependencies = getDependencies(fileContent);

		// 只作用在 shouldSerachComponentName 有具名的情况下
		let hasBDTreeSelect, usesBDTreeSelect;

		if(shouldSerachComponentName !== '') {
			hasBDTreeSelect = false;
        	usesBDTreeSelect = false;
		}

		output += `${file}:\n`;

		for (const dependency of dependencies) {
			const [, componentName, componentPath] = dependency.match(
				/(?:import\s+(\w+)\s+from\s+|require\()['"]([^'"]+)['"]/
			);

			output += `  import '${dependency}'\n`;

			// 检查当前文件是否导入了 bd-tree-select
			if (shouldSerachComponentName !== '') {
				let middleSerachComponentName = camelize2middle(shouldSerachComponentName)
				if(dependency.includes(middleSerachComponentName)){
					hasBDTreeSelect = true;
				}
			}

			if (!componentCounts[componentName]) {
				componentCounts[componentName] = 1;
				componentPaths[componentName] = componentPath;
			} else {
				componentCounts[componentName]++;
			}
		}

		if (shouldSerachComponentName !== '') {
			let middleSerachComponentName = camelize2middle(shouldSerachComponentName)
			let middleSerachComponentNameInHtml = `<${middleSerachComponentName}`
			let serachComponentNameInHtml = `<${shouldSerachComponentName}`
			// 进一步优化
			// 场景1：
			// 检查文件内容是否使用了 bd-tree-select or BdTreeSelect
			if (fileContent.includes(middleSerachComponentNameInHtml) || fileContent.includes(serachComponentNameInHtml)) {
				usesBDTreeSelect = true;
			}

			// 场景2：
			// vue文件中的component是否使用了 BdTreeSelect
			const scriptMatch = fileContent.match(/<script>([\s\S]+?)<\/script>/);
			if (scriptMatch && isDeclaredInComponents(scriptMatch[1], shouldSerachComponentName)) {
				usesBDTreeSelect = true;
			}

			// 输出格式：单纯列举所有使用过的组件的文件路径集合
			// if (hasBDTreeSelect && !usesBDTreeSelect) {
			// 	filesWithBDTreeSelect.push(file);
			// 	unusedBDTreeSelectOutput += `- ${file}\n`;  // 更新bd-tree-select的输出字符串
			// }

			// 优化输出格式
			if (hasBDTreeSelect && !usesBDTreeSelect) {
				unusedBDTreeSelectOutput += `${file}:\n`;
				for (const dependency of dependencies) {
					if (dependency.includes(middleSerachComponentName)) {
						unusedBDTreeSelectOutput += `  import '${dependency}'\n`;
					}
				}
				unusedBDTreeSelectOutput += "\n";
			}
		}
		output += "\n";
	}

	console.log(`Files that imported ${shouldSerachComponentName}:`, filesWithBDTreeSelect);

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

	if(shouldSerachComponentName !== '') {
		// 在函数末尾，将bdTreeSelectOutput字符串写入到新的yml文件中
		const bdTreeSelectOutputPath = path.join(__dirname, `../output/${shouldSerachComponentName}_output.yml`);
		fs.writeFileSync(bdTreeSelectOutputPath, unusedBDTreeSelectOutput);
	}

	return output;
}

function main() {
	const config = getConfig();
	let vueFiles = [];
	let jsFiles = [];

	for (const configPath of config.paths) {
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
		console.error("没有找到任何的vue文件或者JS文件");
		process.exit(1);
	}

	const outputFolderPath = path.join(__dirname, "../output");

	const vueOutputPath = path.join(outputFolderPath, "vue_output.yml");
	
	const vueOutput = processDependencies(vueFiles, getComponentImports);
	fs.writeFileSync(vueOutputPath, vueOutput);

	const jsImportsOutputPath = path.join(outputFolderPath, "js_imports_output.yml");
	const jsImportsOutput = processJsImports([...vueFiles, ...jsFiles], getJsDependencies);
	fs.writeFileSync(jsImportsOutputPath, jsImportsOutput);

	console.log('handle success 处理成功, 输出结果在 output 目录下: \n');
	console.log('1. 主要输出依赖的js文件  ./output/js_imports_output.yml \n')
	console.log('2. 主要输出依赖的vue文件 ./output/vue_output.yml \n')
	console.log('3. js解析到其他内容无法解析的存放目录 ( 可忽略，不影响 ) ./error_log/error_log.yml \n')
}


module.exports = {
	main
};
