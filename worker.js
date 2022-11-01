const fs = require("fs");
const path = require("path");

const { parentPort } = require("worker_threads");

const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const disbleReg = /\/|:|\*|\?|"|<|>|\|/g;

let dirName = "";
let fileName = "";

parentPort.on("message", async (workerData) => {

  /*
   * 1. worker引入`parentPort`，监听主线程的信息。
   *    遍历数据，将不合法符号修改为'-'。
  */
  for (let i = 0, len = workerData.length; i < len; i++) {

    let data = workerData[i];

    dirName = data.dirName.replace(disbleReg, "-");
    fileName = data.fileName.replace(disbleReg, "-");

    createDir();

    await createFile(data.way, data.files);

    if (i === len - 1) {
      // worker执行结束通知主线程
      parentPort.postMessage("done");
    }
  }
});

// 创建次级文件夹
function createDir() {
  const files = fs.readdirSync(path.join(__dirname, "Video"));

  if (!files.includes(dirName)) {
    fs.mkdirSync(path.join(__dirname, "Video", dirName));
  }
}

// ffmpeg合成视频
function createFile(way, files) {
  return new Promise((resolve, reject) => {
    // 如果原本就有这个文件了
    if (fs.readdirSync(path.join(__dirname, "Video", dirName)).includes(`${fileName}.mp4`)) {
      resolve('done');
      return;
    }

    let ff = ffmpeg();

    /*
     * 遍历文件，调用`input()`方法来添加输入。
     * 然后判断是不是有多个视频文件，
     * 如果是，则调用`mergeToFile()`。否则，调用`save()`
    */
    ff.on("end", () => {
      console.log('end');
      resolve('done');
    });

    for (const file of files) {
      ff.input(path.join(way, file));
    }

    console.log(path.join(__dirname, "Video", dirName, `${fileName}.mp4`));

    if (files[0].endsWith("blv") && files.length > 1) {
      ff.mergeToFile(path.join(__dirname, "Video", dirName, `${fileName}.mp4`));
    } else {
      ff.save(path.join(__dirname, "Video", dirName, `${fileName}.mp4`));
    }
  });
}
