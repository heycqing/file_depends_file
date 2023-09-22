const fs = require('fs');
const glob = require('glob');
const path = require('path');

// 获取项目中的所有 Vue 和 JS 文件
// const allFiles = glob.sync('./src/**/*.{vue,js}');
const allFiles = glob.sync('D://code//base//src//kyetree//pages//**//*.{vue,js}')

// 存储所有 Vue 组件的路径
const allVueComponents = allFiles.filter(file => file.endsWith('.vue'));

// 存储被引用的 Vue 组件
const referencedComponents = new Set();

// 遍历所有文件，查找 Vue 组件的引用
allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    allVueComponents.forEach(componentPath => {
        if (content.includes(componentPath)) {
            referencedComponents.add(componentPath);
        }
    });
});

// 筛选出未被引用的 Vue 组件
const unreferencedComponents = allVueComponents.filter(component => !referencedComponents.has(component));

console.log('Unreferenced Vue Components:', unreferencedComponents);


let yamlOutput = `未被引用的vue文件数量是: ${unreferencedComponents.length} \n`  + '未被引用的vue文件路径:\n' ;
unreferencedComponents.forEach((file) => {
  yamlOutput += `- ${file}\n`;
});


// 将结果写入 unused_components.yml 文件
const unusedVueFilesOutputPath = path.join(__dirname, "../output/unused_vue_output_v2.yml");
fs.writeFileSync(unusedVueFilesOutputPath, yamlOutput);
