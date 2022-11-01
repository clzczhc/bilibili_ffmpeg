const fs = require('fs');
const path = require('path');
const {
  Worker
} = require('worker_threads');

let dirName = '';
let fileName = '';

// 合成视频的数组：用于Worker
const generateData = [];

const detailsJson = 'entry.json';

function findDeepest(way) {
  /*
   * 1. 首先获取递归下的文件列表（包括文件和文件夹）。
   * 如果没有文件夹，就调用`generateMp4`方法生成mp4。
  */
  const files = fs.readdirSync(way);

  if (files.every(file => !fs.statSync(path.join(way, file)).isDirectory())) {
    generateMp4(way, files);

    return;
  }

  /*
   * 2. 如果文件列表里包含`entry.json`文件，
   * 那么就调用`getDirAndFileName`方法获取文件夹名、文件名（用全局变量来存储）
  */
  if (files.includes(detailsJson)) {
    getDirAndFileName(path.join(way, files[files.indexOf(detailsJson)]));
  }

  /*
   * 3. 遍历文件列表，如果是文件夹，并且不是`node_modules`，则递归调用`findDeepest`方法
  */
  files.forEach(file => {
    if (fs.statSync(path.join(way, file)).isDirectory() && file != "node_modules") {
      findDeepest(path.join(way, file));
    }
  })

  /*
   * 4. 如果files包含package.json，证明递归完了，并且回退到最初的起点了。
   *   这个时候开启Worker来真正合成视频
  */ 
  if (files.includes('package.json')) {
    let count = Math.ceil(generateData.length / 10);

    while (generateData.length > 0) {
      const workerData = generateData.splice(0, count);

      const worker = new Worker('./worker.js');
      worker.postMessage(workerData);
    
      worker.on('message', (msg) => {
        if (msg === 'done') {
          worker.terminate();
        }
      })
    }
  }
}

// 获取视频文件夹名称、文件名称
function getDirAndFileName(filePath) {
  let fileData = fs.readFileSync(filePath, 'utf8');

  dirName = JSON.parse(fileData).title;
  fileName = JSON.parse(fileData).page_data.part;
}

// 生成Mp4
function generateMp4(way, files) {

  let types = ['blv', 'm4s'];

  files = files.filter(file => {
    return types.some(type => file.endsWith(type));
  })


  if (files.length === 0) {
    return;
  }

  files.sort((a, b) => {
    return (+a.split('.')[0]) - (+b.split('.')[0]);
  })

  generateData.push({
    way,
    files,
    dirName,
    fileName
  });
}

// 创建Video文件夹
function createVideoDir() {
  if (!fs.readdirSync(path.join(__dirname)).includes('Video')) {
    fs.mkdirSync(path.join(__dirname, 'Video'));    
  }
}

module.exports = {
  findDeepest,
  createVideoDir
}