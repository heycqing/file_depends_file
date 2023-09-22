const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
/**
 * 用来查找未使用的vue文件
 *
 * @return {Array} 输出未使用的vue文件数组
 */
function findUnusedVueFiles() {
  // 获取配置
  function getConfigPaths() {
    const configPath = path.join(__dirname, "../config/config.js");
    const configContent = fs.readFileSync(configPath, "utf8");
    return JSON.parse(configContent);
  }

  /**
   * 递归从给定的目录路径和其子目录中检索所有文件。
   *
   * @param {string} dirPath - 要检索文件的目录路径。
   * @param {Array<string>} arrayOfFiles - （可选）用于存储检索到的文件路径的数组。
   * @return {Array<string>} 包含目录及其子目录中所有文件路径的数组。
   */
  const getAllFiles = (dirPath, arrayOfFiles) => {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach((file) => {
      if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
        arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
      } else {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    });
    return arrayOfFiles;
  }

  /**
   * 从给定的文件内容中提取导入语句。
   *
   * @param {string} fileContent - 文件内容。
   * @return {Array<string>} 导入的模块数组。
   */
  const extractImports = (fileContent) => {
    const importRegex = /import\s+(?:\w+\s+from\s+)?['"]([^'"]+)['"]/g;
    const matches = [];
    let match;
    while ((match = importRegex.exec(fileContent)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  /**
   * 获取未被使用的Vue文件
   *
   * @param {string} rootPath - 项目的根路径。
   * @return {Array} 未使用的Vue文件路径的数组。
   */
  const getUnusedVueFiles = (rootPath) => {
     // 获取所有的文件路径
     const allFiles = getAllFiles(rootPath);
     // 获取所有的vue文件数组
     const vueFiles = allFiles.filter((file) => file.endsWith('.vue'));
     // 获取所有的js或者vue文件数组
     const jsAndVueFiles = allFiles.filter(
       (file) => file.endsWith('.js') || file.endsWith('.vue')
     );
     const allImports = [];
     jsAndVueFiles.forEach((file) => {
       const fileContent = fs.readFileSync(file, 'utf8');
       const imports = extractImports(fileContent);
       allImports.push(...imports);
     });
     // 根据 import list 来进行对比，简单比对
     const unusedVueFiles = vueFiles.filter((vueFile) => {
       const relativePath = path.relative(rootPath, vueFile)
       return !allImports.includes(relativePath)
     });
    //  console.log('未使用的 Vue components:', unusedVueFiles)
     return unusedVueFiles || []
  }

  /**
   * 生成一个包含未使用的Vue文件及其路径列表的YAML文件。
   * 
   * @param {string} rootPath - 需要扫描项目的根路径。
   * */
  const writeUnusedVueFilesInFile = (rootPath) => {
 
    const unusedVueFiles = getUnusedVueFiles(rootPath)
     // 判断是否存在未被其他组件使用的组件
     if (unusedVueFiles && unusedVueFiles.length > 0) {
          console.log('存在未被其他组件使用的组件，正在寻址...')
          // 创建一个进度条实例
          // 构建 YAML 格式的字符串
          let yamlOutput = `目前扫描的项目目录: ${rootPath}`
          + `未被引用的vue文件数量是: ${unusedVueFiles.length}\n`
          + '未被引用的vue文件路径:\n'
          unusedVueFiles.forEach((file) => {
            yamlOutput += `- ${file}\n`
          });
          // 将结果写入 unused_components.yml 文件
          const unusedVueFilesOutputPath = path.join(__dirname, "../output/unused_vue_output.yml")
          fs.writeFileSync(unusedVueFilesOutputPath, yamlOutput);
          console.log('√ 已找到未使用的组件，输出路径:  output/unused_vue_output.yml', )
      } else {
        console.log('× 未找到未使用的组件')
      }
  }

  /**
   * 从命令行或者配置文件中获取
   *
   * @return {array|string|null} 返回配置
   */
  const getConf = () => {
    // 命令行优先级高于config
    // 默认紧跟 执行js路径 后一位为 默认根目录路径
    // 从命令行获取 默认路径
    const args = process.argv.slice(2) 
    const configInprocess = args[0]
    // const pathRegex = /^\/([\w-]+\/)*[\w-]+\.[a-zA-Z]{2,}$/;
    // if(configInprocess && pathRegex.test(configInprocess)){
    if (configInprocess) {
      return configInprocess
    }else{
      // 从根目录的配置文件获取
      const conf = getConfigPaths()
      const isHasConf = conf.hasOwnProperty('paths') && (conf.hasOwnProperty('findUnusedVueFile') && conf.findUnusedVueFile)
      if (isHasConf) {
        return conf.paths
      }
      console.log('请检查 config 配置文件 或者 使用命令行操作')
      return
    } 
  } 

  const init = () => {
    // 这里需要判断传进的path是 String 或者 Array
    // const rootPath = 'D://code//base//src//kyetree//pages';
    const rootPath = getConf()
    if (Array.isArray(rootPath)) {
      for (let pathItem of rootPath) {
        writeUnusedVueFilesInFile(pathItem)
      }
    } else if (typeof rootPath === 'string') {
      writeUnusedVueFilesInFile(rootPath)
    }
    // writeUnusedVueFilesInFile(rootPath)
  }

  init()
}

findUnusedVueFiles()

// export default findUnusedVueFiles