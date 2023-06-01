const videoTimeline = document.querySelector('canvas');
const video = document.getElementById('video');
const ctxVideoTimeline = videoTimeline.getContext('2d');
let startTime = Date.now();
const hls = new Hls();
let tracks = [];

// Счетчики проигрывания

// Прорисовка текущей позиции проигрывания видеофайла
function drawCurrentTime() {
  if (videoTimeline.getContext) {
    let seekableEnd = getSeekableEnd();
    ctxVideoTimeline.fillStyle = 'gray';
    let x = (video.currentTime / seekableEnd) * videoTimeline.width;
    ctxVideoTimeline.fillRect(x - 4, 0, 4, 150);

    ctxVideoTimeline.fillStyle = 'blue';
    x = (video.currentTime / seekableEnd) * videoTimeline.width;
    ctxVideoTimeline.fillRect(x, 0, 4, 150);
  }
}

// Прорисовка текущего размера буфера
function drawBuffer() {
  for (let i = 0; i < video.buffered.length; i++) {
    const startX = (video.buffered.start(i) / getSeekableEnd()) * videoTimeline.width;
    const endX = (video.buffered.end(i) / getSeekableEnd()) * videoTimeline.width;
    const width = endX - startX;
    ctxVideoTimeline.fillStyle = 'grey';
    ctxVideoTimeline.fillRect(startX, 0, width, videoTimeline.height);
    ctxVideoTimeline.rect(startX, 0, width, videoTimeline.height);
  }
}

// Изменение размера элемента
function resizeTimelineWindow(canvas) {
  canvas.width = video.clientWidth;
}

// Очищение полосы таймлайна видео
function clearTimeline() {
  if (videoTimeline.getContext) {
    ctxVideoTimeline.clearRect(0, 0, 1000, 150);
  }
}

// Перемещение текущей позиции проигрывания
function onClickBufferedRange(event) {
  clearTimeline();
  let targetTime =
    ((event.clientX - videoTimeline.offsetLeft) / videoTimeline.width) * getSeekableEnd();
  video.currentTime = targetTime;
  drawCurrentTime();
}

resizeTimelineWindow(videoTimeline);

window.addEventListener('resize', (e) => {
  resizeTimelineWindow(videoTimeline);
});

video.addEventListener('playing', () => {
  setInterval(() => {
    drawCurrentTime();
  }, 1000);
});

// Метрики

// Buffer State
function updateBufferStats() {
  let log = `Duration: ${video.duration}\nBuffered: ${timeRangesToString(
    video.buffered,
  )}\nSeekable: ${timeRangesToString(video.seekable)}\nPlayed: ${timeRangesToString(
    video.played,
  )}\n`;
  if (hls.media) {
    for (const type in tracks) {
      log += `Buffer for ${type} contains:${timeRangesToString(tracks[type].buffer.buffered)}\n`;
    }
    const videoPlaybackQuality = video.getVideoPlaybackQuality;
    if (videoPlaybackQuality && typeof videoPlaybackQuality === typeof Function) {
      log += `Dropped frames: ${video.getVideoPlaybackQuality().droppedVideoFrames}\n`;
      log += `Corrupted frames: ${video.getVideoPlaybackQuality().corruptedVideoFrames}\n`;
    } else if (video.webkitDroppedFrameCount) {
      log += `Dropped frames: ${video.webkitDroppedFrameCount}\n`;
    }
  }
  log += `TTFB Estimate: ${hls.ttfbEstimate.toFixed(3)}\n`;
  log += `Bandwidth Estimate: ${hls.bandwidthEstimate.toFixed(3)}\n`;

  document.getElementById('bufferState').textContent = log;
}

function timeRangesToString(r) {
  let log = '';
  for (let i = 0; i < r.length; i++) {
    log += '[' + r.start(i) + ', ' + r.end(i) + ']';
    log += ' ';
  }
  return log;
}

function getSeekableEnd() {
  if (isFinite(video.duration)) {
    return video.duration;
  }
  if (video.seekable.length) {
    return video.seekable.end(video.seekable.length - 1);
  }
  return 0;
}

// Добавление логов для Status
function appendLog(textElId, message) {
  let el = document.getElementById(textElId);
  let logText = el.textContent;
  if (logText.length) {
    logText += '\n';
  }
  let timestamp = (Date.now() - startTime) / 1000;
  let newMessage = timestamp + ' | ' + message;
  logText += newMessage;

  el.textContent = logText;
}

function logStatus(message) {
  appendLog('statusOut', message);
}

let videoSrc =
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8';
if (Hls.isSupported()) {
  hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
    logStatus('manifest loaded, found ' + data.levels.length + ' quality level');
  });
  hls.loadSource(videoSrc);
  hls.attachMedia(video);
  hls.on(Hls.Events.ERROR, function (event, data) {
    const el = document.getElementById('errorOut');
    el.textContent = data.error.stack;
  });
  hls.on(Hls.Events.BUFFER_CREATED, function (eventName, data) {
    tracks = data.tracks;
    updateBufferStats();
  });
  hls.on(Hls.Events.BUFFER_APPENDED, function (eventName, data) {
    clearTimeline();
    drawBuffer();
    drawCurrentTime();
    updateBufferStats();
  });
  hls.on(Hls.Events.MANIFEST_LOADED, function (event, data) {
    logStatus(`Loaded ${data.url}`);
  });
  hls.on(Hls.Events.MEDIA_ATTACHED, function () {
    logStatus('Media element attached');
  });
  hls.on(Hls.Events.MEDIA_DETACHED, function () {
    logStatus('Media element detached');
    tracks = [];
  });
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = videoSrc;
}
