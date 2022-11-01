const path = require('path');
const { findDeepest, createVideoDir } = require('./utils.js')

// 创建video文件夹
createVideoDir();
findDeepest(path.join(__dirname));