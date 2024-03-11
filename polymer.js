const XLSX = require('xlsx');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// 定义日志文件夹的路径
const logFolderPath = path.join(__dirname, 'polymer_logs');

// 确保日志文件夹存在
if (!fs.existsSync(logFolderPath)){
    fs.mkdirSync(logFolderPath, { recursive: true });
}

// 读取Excel文件并获取私钥和其他key信息
function readExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet);
}

// 更新配置文件
function updateConfigFile(configPath, keys) {
    // 读取配置文件内容
    let configContent = fs.readFileSync(configPath, 'utf8');
    // 分割文件内容为行数组
    let lines = configContent.split(/\r?\n/);

    // 需要更新的键值对
    const updates = {
        PRIVATE_KEY_1: keys.PrivateKey,
        OP_ALCHEMY_API_KEY: keys.OpAlchemyApi,
        BASE_ALCHEMY_API_KEY: keys.BaseAlchemyApi,
        OP_BLOCKSCOUT_API_KEY: keys.OpBlockScoutApi,
        BASE_BLOCKSCOUT_API_KEY: keys.BaseBlockScoutApi
    };

    // 遍历每行，更新对应的键值对
    let updatedLines = lines.map(line => {
        // 忽略空行和注释行
        if (line.trim() === '' || line.trim().startsWith('#')) {
            return line;
        }
        let [key, value] = line.split('=');
        key = key.trim();
        // 如果当前行的键需要被更新，替换其值
        if (updates.hasOwnProperty(key)) {
            return `${key}='${updates[key]}'`;
        }
        // 否则，保留原行不变
        return line;
    });

    // 将更新后的行数组合并回字符串，并写回配置文件
    fs.writeFileSync(configPath, updatedLines.join('\n'));
}

// 执行命令并监听输出
function executeCommand(command, args, privateKey) {
    const child = spawn(command, args);
    const timestamp = new Date().getTime();
    // 构造输出文件路径
    const outputPath = path.join(logFolderPath, `${privateKey}_${timestamp}.txt`);
    let output = '';

    child.stdout.on('data', (data) => {
        output += data.toString();
    });

    child.stderr.on('data', (data) => {
        output += `Error: ${data.toString()}`;
    });

    child.on('close', (code) => {
        fs.writeFileSync(outputPath, output);
        console.log(`Command finished with code ${code} and output was saved to ${outputPath}`);
    });
}

// 主逻辑
function main(excelPath, configPath) {
    const data = readExcel(excelPath);
    data.forEach(row => {
        updateConfigFile(configPath, row);
        executeCommand('just', ['do-it'], row.PrivateKey);
    });
}

// 使用示例
main("./OP_Wallets_With_APIs.xlsx", './.env');

