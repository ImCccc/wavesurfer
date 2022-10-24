// http://wavesurfer-js.org/docs/options.html
import React, { createRef } from "react";
import WaveSurfer from "wavesurfer.js";
import Cursor from "wavesurfer.js/src/plugin/cursor";
import Timeline from "wavesurfer.js/src/plugin/timeline";
import Regions, { RegionParams } from "wavesurfer.js/src/plugin/regions";
import "./App.css";

type RegionsProps = {
  id: string; // 区段id, 插件自动生成
  end: string; // 开始时间
  start: string; // 结束时间
  isPlaying?: boolean;
};

interface IState {
  zoom: number;
  duration: number;
  chooseId: string;
  regionsList: RegionsProps[];
}

const wave_backgroundColor = "rgba(0, 0, 0, 0)"; // 背景颜色

const wave_cursorColor = "rgba(0, 0, 0, 0)"; // 时间指针的颜色
const wave_play_cursorColor = "rgba(0, 0, 0, 1)"; // 播放时, 时间指针的颜色

const wave_waveColor = "green"; // 未播放那些波形的颜色
const wave_progressColor = "green"; // 已经播放那些波形的颜色

const range_backgroundColor = "rgba(0, 0, 0, 0.1)"; // 默认时间段的背景颜色
const range_choose_backgroundColor = "rgba(92, 172, 242, 0.2)"; // 选中时间段的背景颜色

const CursorConfig = {
  opacity: "1",
  showTime: true,
  customShowTimeStyle: {
    color: "#fff",
    padding: "4px",
    "font-size": "10px",
    "background-color": "#000",
  },
};

const TimelineConfig = {
  primaryColor: "blue",
  secondaryColor: "red",
  primaryFontColor: "blue",
  secondaryFontColor: "red",
};

let _saveX: number | undefined;
let _thisEnd: number | undefined;
let _thisStart: number | undefined;

const getTimes = () => {
  const times = document.querySelector(".wave showtitle")?.textContent || "";
  const interval = times.split(":");
  let hour = 0;
  let minute = 0;
  let second = 0;
  let millisecond = 0;
  if (interval.length === 3) {
    minute = +interval[0];
    second = +interval[1];
    millisecond = +interval[2];
  }
  if (interval.length === 4) {
    hour = +interval[0];
    minute = +interval[1];
    second = +interval[2];
    millisecond = +interval[3];
  }
  return hour * 3600 + minute * 60 + second + millisecond / 1000;
};

class App extends React.Component<any, any> {
  state: IState = {
    zoom: 1, // 当前缩放
    duration: 0, // 时长
    chooseId: "", // 当前选中的ID
    regionsList: [], // 区域列表
  };

  wavesurfer: WaveSurfer | null = null;
  domWave = createRef<HTMLDivElement>();
  domAddArea = createRef<HTMLDivElement>();
  domTimeline = createRef<HTMLDivElement>();

  createWavesurfer = () => {
    const domWave = this.domWave.current;
    const domTimeline = this.domTimeline.current;
    if (!domWave || !domTimeline) return;

    const wavesurfer = WaveSurfer.create({
      barWidth: 1,
      cursorWidth: 1,
      container: domWave,
      waveColor: wave_waveColor,
      cursorColor: wave_cursorColor,
      progressColor: wave_progressColor,
      backgroundColor: wave_backgroundColor,
      plugins: [
        Regions.create({}),
        Cursor.create(CursorConfig),
        Timeline.create({ container: domTimeline, ...TimelineConfig }),
      ],
    });
    this.wavesurfer = wavesurfer;
    wavesurfer.load("./wavesurfer.mp3");

    // 准备好了, 获取时长, 重置缩放
    wavesurfer.on("ready", () => {
      this.state.duration = wavesurfer.getDuration();
      wavesurfer.zoom(this.state.zoom);
    });

    // 播放时, 设置时间进度条
    wavesurfer.on("play", () => {
      wavesurfer.setCursorColor(wave_play_cursorColor);
    });

    // 结束播放, 取消时间进度条
    wavesurfer.on("pause", () => {
      // 播放结束, 重置播放状态
      const regionsList = this.state.regionsList;
      this.setState({
        regionsList: regionsList.map((v) => ({ ...v, isPlaying: false })),
      });
    });

    // 创建时间段
    wavesurfer.on("region-created", (region: Required<RegionParams>) => {
      const img = document.createElement("img");
      img.className = "delete-icon";
      img.src = "/delete.svg";
      img.setAttribute("data-id", region.id);
      const dom = document.querySelector(`[data-id="${region.id}"]`);
      dom?.appendChild(img);

      const regionsList = [...this.state.regionsList];
      regionsList.push({
        id: region.id,
        end: region.end.toFixed(2),
        start: region.start.toFixed(2),
      });

      this.setState({ regionsList });
    });

    // 修改时间段
    wavesurfer.on("region-update-end", (region: Required<RegionParams>) => {
      const regionsList = [...this.state.regionsList];
      const updateItem = regionsList.find((item) => item.id === region.id);
      if (!updateItem) return;
      updateItem.start = region.start.toFixed(2);
      updateItem.end = region.end.toFixed(2);
      this.setState({ regionsList });

      // 拖拽过程中, 会取消选中, 需要重新选中
      const chooseId = this.state.chooseId;
      if (!chooseId) return;
      const cohhseRegion = wavesurfer.regions.list[chooseId];
      if (!cohhseRegion) return;
      cohhseRegion.element.style.backgroundColor = range_choose_backgroundColor;
    });
  };

  // 根据区间 Id 删除区间
  deleteRegionById = (id: string) => {
    const wavesurfer = this.wavesurfer;
    if (!wavesurfer) return;

    wavesurfer.regions.list[id].remove();
    const { chooseId, regionsList } = this.state;
    this.setState({
      chooseId: chooseId === id ? "" : chooseId,
      regionsList: regionsList?.filter((v) => v.id !== id),
    });
  };

  // 播放区间音频
  playById = (item: RegionsProps) => {
    const id = item.id;

    const wavesurfer = this.wavesurfer;
    if (!wavesurfer) return;
    wavesurfer.regions.list[id].play();

    const regionsList = this.state.regionsList.map((v) => ({
      ...v,
      isPlaying: item.id === v.id,
    }));
    this.setState({ regionsList });
  };

  playPause = (item: RegionsProps) => {
    const id = item.id;

    const wavesurfer = this.wavesurfer;
    if (!wavesurfer) return;

    const { end, start } = wavesurfer.regions.list[id];
    const currentTime = wavesurfer.getCurrentTime();

    // 当前播放进度, 如果不在时间段范围内, 那么默认重新播放
    if (currentTime > end || currentTime < start) {
      wavesurfer.play(start, end);
      const regionsList = this.state.regionsList.map((v) => ({
        ...v,
        isPlaying: item.id === v.id,
      }));
      return this.setState({ regionsList });
    }

    // 当前播放进度, 如果在某个时间段内, 那边可以切换播放状态
    const isPlaying = wavesurfer.isPlaying();
    isPlaying ? wavesurfer.pause() : wavesurfer.play(currentTime, end);
    item.isPlaying = !isPlaying;
    this.setState({ regionsList: [...this.state.regionsList] });
  };

  // 选中区域
  chooseRegion = (id: string) => {
    const wavesurfer = this.wavesurfer;
    if (!wavesurfer) return;

    const chooseId = this.state.chooseId;
    const thisRegion = wavesurfer.regions.list[id];
    // 选中, 需要添加选中的背景颜色
    if (thisRegion) {
      const element = thisRegion.element;
      element.style.backgroundColor = range_choose_backgroundColor;
      // 滚动到当前区域
      element.scrollIntoView && element.scrollIntoView();
    }

    if (chooseId === id) return;

    // 取消上一个选中
    if (chooseId) {
      const prevRegion = wavesurfer.regions.list[chooseId];
      prevRegion.element.style.backgroundColor = range_backgroundColor;
    }

    this.setState({ chooseId: id });
  };

  // 点击音频区域
  waveClick = (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const wavesurfer = this.wavesurfer;
    if (!wavesurfer) return;
    if (_thisStart) return;

    wavesurfer.stop();
    const target = ev.target as HTMLDivElement;
    const className = target.className;
    if (className.includes("delete-icon")) {
      const id = target.getAttribute("data-id") || "";
      this.deleteRegionById(id);
    } else if (className.includes("wavesurfer-region")) {
      const id = target.getAttribute("data-id") || "";
      this.chooseRegion(id);
      wavesurfer.setCursorColor(wave_play_cursorColor);
    } else {
      wavesurfer.setCursorColor(wave_cursorColor);
    }
  };

  // 双击音频区域
  waveDblClick = (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const areaDom = this.domAddArea.current;
    if (!areaDom) return;
    const wavesurfer = this.wavesurfer;
    if (!wavesurfer) return;

    if (_thisStart) {
      // 2次双击创建时段
      _thisEnd = getTimes();
      if (!_thisEnd || !_thisStart || _thisEnd === _thisStart) return;
      wavesurfer.addRegion({
        start: Math.min(_thisEnd, _thisStart),
        end: Math.max(_thisEnd, _thisStart),
        loop: false,
        drag: true,
        resize: true,
        color: range_backgroundColor,
      });
      _saveX = undefined;
      _thisEnd = undefined;
      _thisStart = undefined;
      areaDom.style.width = "0";
      areaDom.style.left = `0`;
    } else {
      // 第一次双击, 记录相关信息
      _saveX = ev.clientX;
      _thisStart = getTimes();
      areaDom.style.width = "1px";
      areaDom.style.left = `${_saveX - 20}px`;
    }
  };

  waveMouseMove = (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!_saveX || !_thisStart) return;
    const areaDom = this.domAddArea.current;
    if (!areaDom) return;
    const offsetX = ev.clientX - _saveX;
    areaDom.style.left =
      offsetX > 0 ? `${_saveX - 20}px` : `${ev.clientX - 20}px`;
    areaDom.style.width = `${Math.abs(offsetX)}px`;
  };

  // 鼠标滚动放大缩小
  waveWheel = (ev: React.WheelEvent<HTMLDivElement>) => {
    const wavesurfer = this.wavesurfer;
    if (!wavesurfer) return;

    const down = ev.nativeEvent.deltaY > 0;
    let zoom = this.state.zoom;
    zoom = down ? Math.max(1, --zoom) : zoom + 1;
    wavesurfer.zoom(zoom);
    this.setState({ zoom });
  };

  startTimeChange = (
    ev: React.ChangeEvent<HTMLInputElement>,
    item: RegionsProps
  ) => {
    const wavesurfer = this.wavesurfer;
    if (!wavesurfer) return;

    const value = ev.target.value;

    if (+value >= 0) {
      const thisRegion = wavesurfer.regions.list[item.id];
      const { start, end } = thisRegion;
      // 偏移量
      let updateTime = +value - start;
      // 不能超过结束时间
      if (updateTime + start < end) {
        thisRegion.onResize(updateTime, "start");
        const element = thisRegion.element;
        element.style.backgroundColor = range_choose_backgroundColor;
      }
    }

    item.start = value;
    this.setState({ regionsList: [...this.state.regionsList] });
  };

  endTimeChange = (
    ev: React.ChangeEvent<HTMLInputElement>,
    item: RegionsProps
  ) => {
    const wavesurfer = this.wavesurfer;
    if (!wavesurfer) return;

    const value = ev.target.value;
    if (+value >= 0) {
      const thisRegion = wavesurfer.regions.list[item.id];
      const { start, end } = thisRegion;
      // 偏移量
      let updateTime = +value - end;

      const duration = this.state.duration;

      // 不能超过结束
      if (updateTime + end > duration) {
        thisRegion.onResize(duration - end, "end");
        item.end = duration.toFixed(2);
        this.setState({ regionsList: [...this.state.regionsList] });
      }

      // 不能低于开始时间
      if (updateTime + end > start) {
        thisRegion.onResize(updateTime, "end");
      }

      const element = thisRegion.element;
      element.style.backgroundColor = range_choose_backgroundColor;
    }

    item.end = value;
    this.setState({ regionsList: [...this.state.regionsList] });
  };

  componentDidMount() {
    this.createWavesurfer();
  }

  render() {
    const { chooseId, regionsList } = this.state;
    const {
      domWave,
      domAddArea,
      domTimeline,
      playById,
      playPause,
      waveClick,
      waveWheel,
      waveDblClick,
      chooseRegion,
      endTimeChange,
      waveMouseMove,
      startTimeChange,
      deleteRegionById,
    } = this;
    return (
      <div className="wrapper">
        <div
          className="wave sk0"
          ref={domWave}
          onClick={waveClick}
          onWheel={waveWheel}
          onMouseMove={waveMouseMove}
          onDoubleClick={waveDblClick}
        >
          <div ref={domAddArea} className="add-area sk0"></div>
        </div>
        <div ref={domTimeline} className="sk0"></div>
        <div className="scroll-box">
          {regionsList.map((item, index) => {
            return (
              <div
                key={item.id}
                className="time-container"
                onClick={() => chooseRegion(item.id)}
                style={{
                  backgroundColor:
                    item.id === chooseId ? range_choose_backgroundColor : "",
                }}
              >
                <div className="title">{"时间分段" + (index + 1)}</div>
                <span>开始时间:</span>
                <input
                  value={item.start}
                  onChange={(e) => startTimeChange(e, item)}
                />
                <span>结束时间:</span>
                <input
                  value={item.end}
                  onChange={(e) => endTimeChange(e, item)}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    chooseRegion(item.id);
                    playById(item);
                  }}
                >
                  重新播放
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    chooseRegion(item.id);
                    playPause(item);
                  }}
                >
                  {item.isPlaying ? "暂停" : "播放"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRegionById(item.id);
                  }}
                >
                  删除
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default App;
